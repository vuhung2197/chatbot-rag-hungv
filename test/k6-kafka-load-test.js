/**
 * k6 Load Test — Kafka Async Chat
 *
 * Scenarios:
 *   smoke    — 1 VU, 30s       verify endpoints hoạt động
 *   load     — 50 VU, 2m       normal load
 *   stress   — 200 VU, 3m      peak load, tìm breaking point
 *
 * Chạy:
 *   k6 run test/k6-kafka-load-test.js                     # smoke
 *   k6 run -e SCENARIO=load test/k6-kafka-load-test.js
 *   k6 run -e SCENARIO=stress test/k6-kafka-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────────
const queueLatency   = new Trend('queue_latency_ms', true);
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
      { duration: '30s', target: 50 },
      { duration: '1m',  target: 50 },
      { duration: '30s', target: 0  },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 100 },
      { duration: '1m',  target: 200 },
      { duration: '30s', target: 200 },
      { duration: '30s', target: 0   },
    ],
  },
};

const scenario = __ENV.SCENARIO || 'smoke';

export const options = {
  scenarios: { [scenario]: SCENARIOS[scenario] },
  thresholds: {
    // async: chỉ đo thời gian vào queue — phải rất nhanh
    'http_req_duration{endpoint:async}': ['p(95)<500'],
    // sync: phụ thuộc OpenAI (~5-8s) — threshold rộng hơn
    'http_req_duration{endpoint:sync}':  ['p(95)<15000'],
    // Tổng error rate
    error_rate:       ['rate<0.05'],
    // Queue latency (nhận requestId)
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

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function () {
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  // Test 1: POST /chat/async — Kafka queue (đo queue latency)
  const start = Date.now();
  const asyncRes = http.post(
    `${BASE_URL}/chat/async`,
    JSON.stringify({ message }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'async' },
    }
  );
  queueLatency.add(Date.now() - start);

  const asyncOk = check(asyncRes, {
    'async: status 202':    (r) => r.status === 202,
    'async: has requestId': (r) => {
      try { return !!JSON.parse(r.body).requestId; } catch { return false; }
    },
  });
  errorRate.add(!asyncOk);
  if (asyncOk) queuedRequests.add(1);

  sleep(0.5);

  // Test 2: POST /chat — sync baseline (đo end-to-end latency OpenAI)
  const syncRes = http.post(
    `${BASE_URL}/chat`,
    JSON.stringify({ message }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'sync' },
      timeout: '30s',
    }
  );

  const syncOk = check(syncRes, {
    'sync: status 200': (r) => r.status === 200,
    'sync: has reply':  (r) => {
      try { return !!JSON.parse(r.body).reply; } catch { return false; }
    },
  });
  errorRate.add(!syncOk);

  sleep(1);
}

// ─── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const m = data.metrics;

  const asyncDur  = m['http_req_duration{endpoint:async}']?.values;
  const syncDur   = m['http_req_duration{endpoint:sync}']?.values;
  const queue     = m['queue_latency_ms']?.values;
  const errRate   = m['error_rate']?.values;
  const reqs      = m['http_reqs']?.values;
  const queued    = m['queued_requests_total']?.values;

  const fmt = (v) => v != null ? `${v.toFixed(0)}ms` : 'N/A';

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║         LOAD TEST SUMMARY            ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║ Scenario        : ${scenario.padEnd(18)}║`);
  console.log(`║ Total HTTP reqs : ${String(reqs?.count ?? 0).padEnd(18)}║`);
  console.log(`║ Queued (Kafka)  : ${String(queued?.count ?? 0).padEnd(18)}║`);
  console.log(`║ Error rate      : ${((errRate?.rate ?? 0)*100).toFixed(2).padEnd(17)}%║`);
  console.log('╠══════════════════════════════════════╣');
  console.log('║ /chat/async (Kafka queue)            ║');
  console.log(`║   avg   : ${fmt(asyncDur?.avg).padEnd(28)}║`);
  console.log(`║   p95   : ${fmt(asyncDur?.['p(95)']).padEnd(28)}║`);
  console.log(`║   max   : ${fmt(asyncDur?.max).padEnd(28)}║`);
  console.log('╠══════════════════════════════════════╣');
  console.log('║ Kafka queue latency (push only)      ║');
  console.log(`║   avg   : ${fmt(queue?.avg).padEnd(28)}║`);
  console.log(`║   p95   : ${fmt(queue?.['p(95)']).padEnd(28)}║`);
  console.log('╠══════════════════════════════════════╣');
  console.log('║ /chat (sync — OpenAI baseline)       ║');
  console.log(`║   avg   : ${fmt(syncDur?.avg).padEnd(28)}║`);
  console.log(`║   p95   : ${fmt(syncDur?.['p(95)']).padEnd(28)}║`);
  console.log(`║   max   : ${fmt(syncDur?.max).padEnd(28)}║`);
  console.log('╚══════════════════════════════════════╝\n');

  return {
    'test/results/summary.json': JSON.stringify(data, null, 2),
  };
}
