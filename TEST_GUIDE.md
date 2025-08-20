# 🧪 Token Refresh System Testing Guide

## 📋 Quick Start Testing

### 1. Database Setup
```bash
# Run the migration first
mysql -u root -p123456 chatbot < db/update_tokens_schema.sql

# Verify schema
mysql -u root -p123456 chatbot -e "DESCRIBE google_tokens;"
```

### 2. Run Comprehensive Tests
```bash
# All tests (recommended first run)
node test/manual_tests.js

# Specific test suites
node test/proactive_refresh_test.js
node test/error_scenarios_test.js

# Real-time monitoring
node test/monitoring_tools.js monitor
```

---

## 🎯 Test Scenarios & Expected Results

### ✅ **PROACTIVE REFRESH TESTS**

#### Test 1: Token expires in 30 seconds
```bash
# Setup
UPDATE google_tokens SET access_token_expires_at = DATE_ADD(NOW(), INTERVAL 30 SECOND);

# Expected: Auto-refresh triggered
# Result: ✅ New token with ~3600s expiry
# Log: "🔄 Token expires in 30s, refreshing proactively..."
```

#### Test 2: Token expires in 90 seconds  
```bash
# Setup
UPDATE google_tokens SET access_token_expires_at = DATE_ADD(NOW(), INTERVAL 90 SECOND);

# Expected: No refresh (>60s remaining)
# Result: ✅ Existing token returned
# Log: No refresh message
```

#### Test 3: Token already expired
```bash
# Setup  
UPDATE google_tokens SET access_token_expires_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE);

# Expected: Immediate refresh attempt
# Result: ✅ New token or error if no refresh_token
# Log: "🔄 Token expires in -300s, refreshing proactively..."
```

### 🛡️ **ERROR HANDLING TESTS**

#### Test 4: Missing refresh token
```sql
UPDATE google_tokens SET refresh_token_encrypted = NULL;
```
**Expected**: `Error: No refresh token found for user`

#### Test 5: Invalid refresh token
```sql  
UPDATE google_tokens SET refresh_token_encrypted = 'invalid_data';
```
**Expected**: `Error: Token refresh failed` + increment refresh_attempts

#### Test 6: High refresh attempts (≥3)
```sql
UPDATE google_tokens SET refresh_attempts = 5;  
```
**Expected**: refresh_token cleared after multiple failures

### 🌐 **API INTEGRATION TESTS**

#### Test 7: Email API with auto-refresh
```bash
curl -H "Authorization: Bearer fake-token" http://localhost:3001/email/gmail
```

**Expected Response**:
```json
{
  "data": [...],
  "tokenInfo": {
    "expiresAt": "2024-01-01T12:00:00.000Z", 
    "timeUntilExpiry": 3540
  }
}
```

#### Test 8: Token status endpoint
```bash
curl http://localhost:3001/email/token/status?email=hung97vu@gmail.com
```

**Expected Response**:
```json
{
  "email": "hung97vu@gmail.com",
  "tokenStatus": {
    "needsRefresh": false,
    "expiresIn": 3540000
  }
}
```

---

## 🔍 Browser Console Testing

### Setup
1. Open your app in browser
2. Open Developer Console (F12)  
3. Paste test functions from `test/browser_tests.js`

### Quick Tests
```javascript
// Test email API
await testEmailAPI();

// Check token status
await checkTokenStatus();

// Monitor token changes
monitorTokens(10, 5); // 10s intervals, 5 minutes

// Simulate expiry scenario  
simulateExpiryScenario();
```

### Expected Browser Results
```
📡 API Response: {status: 200, dataCount: 15, tokenInfo: {expiresAt: "...", timeUntilExpiry: 3540}}
🔐 Token expires in: 3540s (59m 0s)
✅ Token is valid for 3540s
```

---

## 🎮 Manual Testing Scenarios

### Scenario A: Simulate Expiring Token
1. **Set token to expire soon**:
   ```sql
   UPDATE google_tokens 
   SET access_token_expires_at = DATE_ADD(NOW(), INTERVAL 45 SECOND)
   WHERE email = 'hung97vu@gmail.com';
   ```

2. **Make API call** (within 45 seconds):
   - Visit email tab in app
   - Should auto-refresh seamlessly
   - Check logs for "🔄 Token expires in XXs, refreshing proactively..."

3. **Verify refresh**:
   ```sql
   SELECT 
     TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) as seconds_left,
     refresh_attempts,
     last_refresh_at
   FROM google_tokens WHERE email = 'hung97vu@gmail.com';
   ```

### Scenario B: Multiple Concurrent Requests
1. **Set token to expire in 30s**
2. **Open 3 browser tabs** 
3. **Click email tab simultaneously** in all tabs
4. **Expected**: Only 1 refresh attempt, all tabs work

### Scenario C: Network Interruption
1. **Disconnect internet**
2. **Try to access email tab**
3. **Expected**: Graceful error message
4. **Reconnect and retry**: Should work

---

## 📊 Monitoring Dashboard

### Real-time Monitoring
```bash
node test/monitoring_tools.js monitor
```

**Shows**:
- ✅ Token status (OK/WARNING/EXPIRING SOON/EXPIRED)  
- ⏰ Time until expiry for each token
- 🔄 Refresh attempts count
- 📈 Recent refresh activity

### System Health Report
```bash
node test/monitoring_tools.js report
```

**Provides**:
- 📊 Overall system statistics
- ⚠️ Problem tokens needing attention  
- 💡 Recommendations for fixes
- 🏥 Health score (0-100%)

---

## ✅ Test Results Validation

### Success Criteria Checklist

- [ ] **Proactive Refresh**: Tokens <60s auto-refresh
- [ ] **No Unnecessary Refresh**: Tokens >60s don't refresh  
- [ ] **Error Handling**: Graceful failure with meaningful messages
- [ ] **API Integration**: Seamless user experience
- [ ] **Database Consistency**: Proper attempt tracking
- [ ] **Concurrent Safety**: No race conditions
- [ ] **Performance**: Fast refresh execution (<2s)

### Performance Benchmarks

| Scenario | Expected Time | Acceptable Range |
|----------|---------------|------------------|
| Token Refresh | <2 seconds | 0.5-5 seconds |
| API Call (fresh token) | <1 second | 0.2-3 seconds |
| API Call (needs refresh) | <3 seconds | 1-8 seconds |

---

## 🐛 Troubleshooting Common Issues

### Issue: "No refresh token found"
**Solution**: User needs to re-authenticate via OAuth flow

### Issue: "Token refresh failed"  
**Possible Causes**:
- Network connectivity issues
- Invalid Google Client ID/Secret
- Revoked OAuth permissions
- Rate limiting from Google API

### Issue: High refresh attempts
**Investigation**:
```sql
SELECT email, refresh_attempts, last_refresh_at 
FROM google_tokens 
WHERE refresh_attempts >= 3;
```

### Issue: Tokens not refreshing proactively
**Debug Steps**:
1. Check `loadTokens()` function calls
2. Verify 60-second threshold logic
3. Check database expiry timestamps
4. Review server logs for errors

---

## 📋 Test Checklist Summary

### Before Deployment
- [ ] Database migration completed
- [ ] All unit tests pass
- [ ] Manual scenario testing completed
- [ ] Error handling validated
- [ ] Performance benchmarks met
- [ ] Monitoring dashboard functional

### Post Deployment
- [ ] Real user token refresh monitored
- [ ] Error rates within acceptable limits  
- [ ] System health score >80%
- [ ] No user-reported authentication issues

---

## 🚨 Emergency Procedures

### If Token System Fails
1. **Check server logs** for detailed error messages
2. **Verify database connectivity** and schema
3. **Test Google API connectivity** manually  
4. **Temporarily disable proactive refresh** if needed:
   ```javascript
   // In tokenStore.js, comment out auto-refresh logic
   // if (timeUntilExpiry < 60000 && row.refresh_token_encrypted) {
   //   return await refreshAccessToken(email);
   // }
   ```

### Rollback Plan
1. **Revert database schema**:
   ```sql
   ALTER TABLE google_tokens 
   DROP COLUMN access_token_expires_at,
   DROP COLUMN refresh_token_encrypted,
   DROP COLUMN refresh_attempts,
   DROP COLUMN last_refresh_at;
   ```

2. **Restore previous tokenStore.js** from git

---

**Testing Complete! 🎉**

For additional support or advanced testing scenarios, refer to the individual test files in the `/test` directory.