# 🚀 Quick Reference: Code Fixes

## 🔴 CRITICAL - Fix Today

### 1. SQL Injection
```javascript
// ❌ BAD
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ GOOD
const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

### 2. Input Validation
```javascript
// Install: npm install joi
import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const { error, value } = schema.validate(req.body);
if (error) return res.status(400).json({ message: error.details[0].message });
```

### 3. Rate Limiting
```javascript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Logging
```javascript
// ❌ BAD
console.log('User data:', user);

// ✅ GOOD
import { logger } from './utils/logger.js';
logger.info('User logged in', { userId: user.id });
```

---

## 🟠 HIGH - Fix This Week

### 5. CORS Whitelist
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

### 6. Health Check
```javascript
app.get('/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

### 7. Request Timeout
```javascript
// Install: npm install connect-timeout
import timeout from 'connect-timeout';

app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});
```

### 8. Error Handlers
```javascript
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});
```

---

## 🟡 MEDIUM - Fix Soon

### 9. Compression
```javascript
// Install: npm install compression
import compression from 'compression';
app.use(compression());
```

### 10. Security Headers
```javascript
// Install: npm install helmet
import helmet from 'helmet';
app.use(helmet());
```

### 11. API Versioning
```javascript
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/auth', authRoutes);
```

---

## 📝 Environment Variables

Add to `.env`:
```env
# Required
DB_HOST=localhost
DB_USER=chatbot_user
DB_PASSWORD=your_secure_password
DB_DATABASE=chatbot
JWT_SECRET=your_jwt_secret_minimum_32_characters
OPENAI_API_KEY=sk-proj-xxx

# Recommended
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=DEBUG
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Optional
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

---

## 🛠️ Installation Commands

```bash
# Critical dependencies
npm install joi express-rate-limit

# High priority
npm install connect-timeout uuid

# Medium priority
npm install compression helmet

# Development
npm install --save-dev jest supertest
```

---

## 🧪 Testing Commands

```bash
# Test database connection
node -e "import('./db.js').then(() => console.log('DB OK'))"

# Test with development logging
NODE_ENV=development LOG_LEVEL=DEBUG npm start

# Test with production logging
NODE_ENV=production LOG_LEVEL=INFO npm start

# Run linter
npm run lint

# Format code
npm run format
```

---

## 📋 Checklist

- [ ] Update `.env` with all required variables
- [ ] Install critical dependencies
- [ ] Fix SQL injection vulnerabilities
- [ ] Add input validation
- [ ] Implement rate limiting
- [ ] Replace console.log with logger
- [ ] Add health check endpoint
- [ ] Add error handlers
- [ ] Test thoroughly

---

## 📚 Full Documentation

- `CODE_REVIEW_SUMMARY.md` - Overview
- `CODE_REVIEW_REPORT.md` - Detailed report
- `CODE_QUALITY_CHECKLIST.md` - Progress tracking
- `LOGGING_MIGRATION_GUIDE.md` - Logging guide

---

**Print this page for quick reference!** 📄
