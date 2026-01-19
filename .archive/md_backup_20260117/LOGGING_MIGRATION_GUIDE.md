# 🔄 Migration Guide: Logging System

## Overview

Dự án đã được cập nhật để sử dụng **centralized logging system** thay vì `console.log` trực tiếp. Hệ thống logging mới cung cấp:

- ✅ Environment-aware logging (development vs production)
- ✅ Log levels (ERROR, WARN, INFO, DEBUG)
- ✅ Structured logging cho production
- ✅ Colored output cho development
- ✅ Context-based logging

---

## What Changed

### Before (Old Way)
```javascript
console.log('User logged in:', userId);
console.error('Database error:', error);
console.warn('Deprecated API used');
```

### After (New Way)
```javascript
import { logger } from './utils/logger.js';

logger.info('User logged in', { userId });
logger.error('Database error', error);
logger.warn('Deprecated API used');
```

---

## Migration Steps

### Step 1: Import Logger

Replace console imports with logger:

```javascript
// ❌ Remove this (if exists)
// import console from 'console';

// ✅ Add this
import { logger } from '../utils/logger.js'; // Adjust path as needed
```

### Step 2: Replace console.log

Find and replace all console statements:

```bash
# Search for console usage
grep -r "console\." backend/ --include="*.js" | grep -v "node_modules"
```

**Replacement Guide:**

| Old | New |
|-----|-----|
| `console.log(...)` | `logger.info(...)` |
| `console.error(...)` | `logger.error(...)` |
| `console.warn(...)` | `logger.warn(...)` |
| `console.debug(...)` | `logger.debug(...)` |

### Step 3: Update Log Format

**Before:**
```javascript
console.log('User created:', user);
console.log(`Processing ${count} items`);
```

**After:**
```javascript
logger.info('User created', { userId: user.id, email: user.email });
logger.info('Processing items', { count });
```

### Step 4: Error Logging

**Before:**
```javascript
try {
  // code
} catch (error) {
  console.error('Error:', error);
}
```

**After:**
```javascript
try {
  // code
} catch (error) {
  logger.error('Operation failed', error, { 
    context: 'additional info' 
  });
}
```

---

## Logger API Reference

### Methods

#### `logger.info(message, meta)`
Log informational messages (default level)
```javascript
logger.info('Server started', { port: 3001 });
```

#### `logger.error(message, error, meta)`
Log errors with stack traces
```javascript
logger.error('Database query failed', error, { query: 'SELECT ...' });
```

#### `logger.warn(message, meta)`
Log warnings
```javascript
logger.warn('Deprecated API endpoint used', { endpoint: '/old-api' });
```

#### `logger.debug(message, meta)`
Log debug information (only in development)
```javascript
logger.debug('Cache hit', { key: 'user:123' });
```

#### `logger.child(context)`
Create child logger with additional context
```javascript
const userLogger = logger.child('UserService');
userLogger.info('User created'); // Logs: [Backend:UserService] User created
```

---

## Environment Configuration

Add to your `.env` file:

```env
# Logging configuration
LOG_LEVEL=DEBUG  # Options: ERROR, WARN, INFO, DEBUG
NODE_ENV=development  # Options: development, production
```

### Log Levels

- **ERROR**: Only errors (production default)
- **WARN**: Errors + warnings
- **INFO**: Errors + warnings + info (recommended)
- **DEBUG**: All logs (development default)

---

## Production vs Development

### Development Output
```
2026-01-16T08:59:54.123Z ℹ️ INFO [Backend] Server started { port: 3001, env: 'development' }
```

### Production Output (JSON)
```json
{
  "level": "INFO",
  "context": "Backend",
  "message": "Server started",
  "meta": { "port": 3001, "env": "production" },
  "timestamp": "2026-01-16T08:59:54.123Z"
}
```

---

## Best Practices

### ✅ DO

```javascript
// Use structured logging
logger.info('User action', { userId, action: 'login' });

// Log errors with context
logger.error('Payment failed', error, { userId, amount });

// Use appropriate log levels
logger.debug('Cache lookup', { key }); // Only in dev
logger.info('User registered', { userId }); // Important events
logger.warn('Rate limit approaching', { userId, count }); // Warnings
logger.error('Database connection lost', error); // Errors
```

### ❌ DON'T

```javascript
// Don't log sensitive data
logger.info('User login', { password: '123456' }); // ❌

// Don't use console.log
console.log('User data:', user); // ❌

// Don't log too much in production
logger.debug('Every single request'); // ❌ (use INFO or higher)

// Don't log objects without context
logger.info(user); // ❌ (no message)
```

---

## Sanitizing Sensitive Data

Always sanitize before logging:

```javascript
// ❌ BAD
logger.info('User data', { user });

// ✅ GOOD
logger.info('User logged in', {
  userId: user.id,
  email: user.email.replace(/(.{3}).*(@.*)/, '$1***$2'), // mask email
  // Don't log: password, tokens, credit cards
});
```

---

## Migration Checklist

- [ ] Install logger in all files that use console
- [ ] Replace all `console.log` with `logger.info`
- [ ] Replace all `console.error` with `logger.error`
- [ ] Replace all `console.warn` with `logger.warn`
- [ ] Replace all `console.debug` with `logger.debug`
- [ ] Remove sensitive data from logs
- [ ] Test in development mode
- [ ] Test in production mode
- [ ] Update documentation

---

## Testing

### Test Development Logging
```bash
NODE_ENV=development LOG_LEVEL=DEBUG npm start
```

### Test Production Logging
```bash
NODE_ENV=production LOG_LEVEL=INFO npm start
```

---

## Troubleshooting

### Issue: Logs not showing
**Solution**: Check `LOG_LEVEL` environment variable

### Issue: Too many logs in production
**Solution**: Set `LOG_LEVEL=WARN` or `LOG_LEVEL=ERROR`

### Issue: Need more context in logs
**Solution**: Use `logger.child()` to create contextual loggers

---

## Next Steps

1. Complete migration of all console.log statements
2. Set up log aggregation (e.g., Winston + CloudWatch, Datadog)
3. Add request ID tracking for better tracing
4. Implement log rotation for file-based logs

---

## Questions?

Refer to:
- `backend/utils/logger.js` - Logger implementation
- `CODE_REVIEW_REPORT.md` - Full review report
- `.agent/workflows/request.md` - Standard workflow
