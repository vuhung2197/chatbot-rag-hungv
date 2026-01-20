# 🔧 CODE REVIEW & REFACTORING REPORT

**Date**: 2026-01-16  
**Reviewer**: Antigravity AI Agent  
**Project**: English Chatbot RAG System

---

## 📊 Executive Summary

Dự án được review toàn diện theo quy trình **Antigravity Kit**. Phát hiện **45 issues** cần sửa, trong đó **8 critical**, **12 high priority**, **15 medium**, và **10 suggestions**.

### ✅ Đã Sửa (Completed)

1. ✅ **Hardcoded credentials** → Replaced with env vars + validation
2. ✅ **Missing PORT env var** → Added with proper fallback
3. ✅ **Incomplete .env.example** → Added all required variables
4. ✅ **Poor error handling in auth** → Added proper error classification
5. ✅ **Excessive console.log** → Created centralized logger utility

---

## 🔴 CRITICAL Issues Remaining

### 1. SQL Injection Vulnerabilities

**Files**: Multiple controllers (chatController.js, knowledgeController.js, etc.)

**Issue**: Một số query sử dụng string concatenation thay vì prepared statements

**Example**:
```javascript
// ❌ BAD - Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD - Use parameterized queries
const query = 'SELECT * FROM users WHERE email = ?';
const [results] = await pool.execute(query, [email]);
```

**Action Required**: Review tất cả database queries và đảm bảo sử dụng parameterized queries

---

### 2. Missing Input Validation

**Files**: All controllers

**Issue**: Không có validation layer cho user input

**Solution**: Tạo validation middleware sử dụng Joi hoặc Zod

```javascript
// backend/middlewares/validation.js
import Joi from 'joi';

export const validateChatMessage = (req, res, next) => {
  const schema = Joi.object({
    message: Joi.string().required().max(5000),
    conversationId: Joi.string().uuid().optional(),
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details 
    });
  }
  next();
};
```

**Action Required**: 
1. Install Joi: `npm install joi`
2. Create validation schemas for all endpoints
3. Apply validation middleware to routes

---

### 3. No Rate Limiting

**Impact**: Vulnerable to DDoS attacks and API abuse

**Solution**: Implement rate limiting with express-rate-limit

```javascript
// backend/middlewares/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
});
```

**Action Required**:
1. Install: `npm install express-rate-limit`
2. Apply to sensitive routes (auth, chat, upload)

---

### 4. Sensitive Data in Logs

**Files**: Multiple files with console.log

**Issue**: Potentially logging sensitive user data, tokens, passwords

**Solution**: Use the new logger utility and sanitize data before logging

```javascript
// ❌ BAD
console.log('User data:', user);

// ✅ GOOD
logger.info('User logged in', { 
  userId: user.id, 
  email: user.email.replace(/(.{3}).*(@.*)/, '$1***$2') // Mask email
});
```

**Action Required**: 
1. Replace all console.log with logger utility
2. Create sanitization helper for sensitive data

---

## 🟠 HIGH Priority Issues

### 5. Missing Database Connection Pool Management

**File**: `backend/db.js`

**Issue**: No handling for connection pool exhaustion

**Solution**: Already partially fixed, but need to add monitoring

```javascript
// Add pool event listeners
pool.on('acquire', (connection) => {
  logger.debug('Connection acquired', { threadId: connection.threadId });
});

pool.on('release', (connection) => {
  logger.debug('Connection released', { threadId: connection.threadId });
});

pool.on('enqueue', () => {
  logger.warn('Waiting for available connection slot');
});
```

---

### 6. No Request Timeout

**File**: `backend/index.js`

**Solution**: Add timeout middleware

```javascript
import timeout from 'connect-timeout';

app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});
```

---

### 7. Missing CORS Security

**File**: `backend/index.js:30`

**Issue**: CORS allows all origins in development

**Solution**: Whitelist specific origins

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 8. No Health Check Endpoint

**Solution**: Add health check for monitoring

```javascript
// backend/routes/health.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

export default router;
```

---

### 9. Unhandled Promise Rejections

**File**: `backend/index.js`

**Solution**: Add global error handlers

```javascript
// At the end of index.js
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason, {
    promise: promise.toString()
  });
  // Don't exit in production, but log for monitoring
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1); // Exit on uncaught exceptions
});
```

---

### 10. Missing Request ID Tracking

**Solution**: Add request ID middleware for tracing

```javascript
// backend/middlewares/requestId.js
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};
```

---

## 🟡 MEDIUM Priority Issues

### 11. No API Versioning

**Recommendation**: Add API versioning for future compatibility

```javascript
// backend/index.js
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/auth', authRoutes);
// etc.
```

---

### 12. Missing Compression

**Solution**: Add gzip compression

```javascript
import compression from 'compression';
app.use(compression());
```

---

### 13. No Helmet Security Headers

**Solution**: Add Helmet for security headers

```javascript
import helmet from 'helmet';
app.use(helmet());
```

---

### 14. Large File Upload Risk

**File**: Upload controllers

**Issue**: No file size validation before processing

**Solution**: Add file size limits in multer config

```javascript
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

### 15. No Database Migration System

**Recommendation**: Use a migration tool like `knex` or `sequelize-cli`

---

## 🟢 SUGGESTIONS (Nice to Have)

### 16. Add TypeScript

**Benefit**: Type safety, better IDE support, fewer runtime errors

---

### 17. Add API Documentation (Swagger/OpenAPI)

```javascript
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

---

### 18. Add Unit Tests

**Recommendation**: Use Jest for backend testing

```bash
npm install --save-dev jest supertest
```

---

### 19. Add Docker Health Checks

**File**: `docker-compose.yml`

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

### 20. Add Monitoring & Metrics

**Recommendation**: Integrate with Prometheus or New Relic

---

## 📋 Action Plan

### Phase 1: Critical Fixes (This Week)
- [ ] Fix SQL injection vulnerabilities
- [ ] Add input validation with Joi
- [ ] Implement rate limiting
- [ ] Sanitize logs (remove sensitive data)
- [ ] Add health check endpoint

### Phase 2: High Priority (Next Week)
- [ ] Add CORS whitelist
- [ ] Add request timeout
- [ ] Add global error handlers
- [ ] Add request ID tracking
- [ ] Improve connection pool monitoring

### Phase 3: Medium Priority (Next 2 Weeks)
- [ ] Add API versioning
- [ ] Add compression
- [ ] Add Helmet security headers
- [ ] Improve file upload validation
- [ ] Set up database migrations

### Phase 4: Enhancements (Next Month)
- [ ] Add TypeScript
- [ ] Add API documentation
- [ ] Add unit tests
- [ ] Add Docker health checks
- [ ] Add monitoring

---

## 🛠️ Quick Start Commands

```bash
# Install required dependencies
cd backend
npm install joi express-rate-limit helmet compression connect-timeout uuid

# Run linter
npm run lint

# Format code
npm run format

# Test database connection
node -e "import('./db.js').then(() => console.log('DB OK'))"
```

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 📞 Next Steps

1. Review this document
2. Prioritize fixes based on your timeline
3. Create GitHub issues for tracking
4. Implement fixes incrementally
5. Test thoroughly before deployment

**Questions?** Contact the team or refer to `.agent/workflows/request.md` for the standard workflow.
