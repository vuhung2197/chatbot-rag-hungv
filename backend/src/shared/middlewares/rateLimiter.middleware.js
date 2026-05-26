import rateLimit from 'express-rate-limit';

const makeSkip = () => (req) => {
  const token = process.env.LOAD_TEST_TOKEN;
  return !!token && req.headers['x-load-test'] === token;
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
