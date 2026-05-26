/**
 * k6 Load Test — Kafka Async Chat
 *
 * Scenarios:
 *   smoke    — 1 VU, 30s  — verify endpoints hoạt động
 *   load     — 50 VU, 2m  — normal load
 *   stress   — 200 VU, 3m — peak load, tìm breaking point
 *
 * Chạy:
 *   k6 run test/k6-kafka-load-test.js                    # mặc định: smoke
 *   k6 run -e SCENARIO=load test/k6-kafka-load-test.js
 *   k6 run -e SCENARIO=stress test/k6-kafka-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────────
const queueLatency   = new Trend('queue_latency_ms', true);   // thời gian đến khi có requestId
const errorRate      = new Rate('error_rate');
const queuedRequests = new Counter('queued_requests_total');

// ─── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },   // ramp up
      { duration: '1m',  target: 50 },   // hold
      { duration: '30s', target: 0 },    // ramp down
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 100 },  // ramp up
      { duration: '1m',  target: 200 },  // stress
      { duration: '30s', target: 200 },  // hold peak
      { duration: '30s', target: 0 },    // ramp down
    ],
  },
};

const scenario = __ENV.SCENARIO || 'smoke';

export const options = {
  scenarios: {
    [scenario]: SCENARIOS[scenario],
  },
  thresholds: {
    // 95% request phải dưới 2s
    http_req_duration: ['p(95)<2000'],
    // Error rate phải dưới 5%
    error_rate: ['rate<0.05'],
    // Queue latency (nhận requestId) dưới 500ms
    queue_latency_ms: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

const MESSAGES = [
  'Hello, how are you?',
  'What is machine learning?',
  'Explain RAG in simple terms',
  'What is the capital of Vietnam?',
  'How do I learn English faster?',
];

// ─── Main test function (runs per VU iteration) ────────────────────────────────
export default function () {
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  // ── Test 1: POST /chat/async (Kafka queue) ────────────────────────────────
  const start = Date.now();
  const asyncRes = http.post(
    `${BASE_URL}/chat/async`,
    JSON.stringify({ message }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  queueLatency.add(Date.now() - start);

  const asyncOk = check(asyncRes, {
    '/chat/async status 202':    (r) => r.status === 202,
    '/chat/async has requestId': (r) => {
      try { return !!JSON.parse(r.body).requestId; } catch { return false; }
    },
  });

  errorRate.add(!asyncOk);
  if (asyncOk) queuedRequests.add(1);

  sleep(0.5);

  // ── Test 2: POST /chat (sync — baseline so sánh) ──────────────────────────
  const syncRes = http.post(
    `${BASE_URL}/chat`,
    JSON.stringify({ message }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(syncRes, {
    '/chat status 200':      (r) => r.status === 200,
    '/chat has reply':       (r) => {
      try { return !!JSON.parse(r.body).reply; } catch { return false; }
    },
  });

  sleep(1);
}

// ─── Summary sau khi test xong ─────────────────────────────────────────────────
export function handleSummary(data) {
  const metrics = data.metrics;
  const dur     = metrics.http_req_duration?.values;
  const queue   = metrics.queue_latency_ms?.values;

  console.log('\n========= TEST SUMMARY =========');
  console.log(`Scenario      : ${scenario}`);
  console.log(`Total requests: ${metrics.http_reqs?.values?.count ?? 0}`);
  console.log(`Error rate    : ${((metrics.error_rate?.values?.rate ?? 0) * 100).toFixed(2)}%`);
  if (dur) {
    console.log(`Response time : avg=${dur.avg?.toFixed(0)}ms  p95=${dur['p(95)']?.toFixed(0)}ms  max=${dur.max?.toFixed(0)}ms`);
  }
  if (queue) {
    console.log(`Queue latency : avg=${queue.avg?.toFixed(0)}ms  p95=${queue['p(95)']?.toFixed(0)}ms`);
  }
  console.log(`Queued msgs   : ${metrics.queued_requests_total?.values?.count ?? 0}`);
  console.log('=================================\n');

  return {
    'test/results/summary.json': JSON.stringify(data, null, 2),
  };
}
