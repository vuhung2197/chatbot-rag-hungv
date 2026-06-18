import rateLimit from 'express-rate-limit';

const makeSkip = () => (req) => {
  const token = process.env.LOAD_TEST_TOKEN;
  if (token && req.headers['x-load-test'] === token) return true;
  // Bỏ qua endpoint polling kết quả async (GET /chat/result/:jobId) — chỉ đọc Redis,
  // cần poll nhiều lần nên KHÔNG tính vào giới hạn AI.
  if (req.method === 'GET' && /\/chat\/result\//.test(req.originalUrl || '')) return true;
  return false;
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: makeSkip(),
});

export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { message: 'AI request limit reached. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: makeSkip(),
});

export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: makeSkip(),
});
