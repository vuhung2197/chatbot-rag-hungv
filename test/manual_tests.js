#!/usr/bin/env node
// Manual testing script for token refresh system
// Usage: node test/manual_tests.js

import '../backend/bootstrap/env.js';
import { 
  setTokenExpiry, 
  getTokenInfo, 
  testTokenRefresh, 
  simulateApiCall,
  runTestScenarios 
} from './token_test_utils.js';

const TEST_EMAIL = 'hung97vu@gmail.com'; // Use real email with tokens

async function testProactiveRefresh() {
  console.log('\n🔄 TEST: Proactive Refresh (<60s)');
  console.log('=====================================');
  
  // Set token to expire in 30 seconds
  await setTokenExpiry(TEST_EMAIL, 30);
  
  // Test loadTokens - should trigger refresh
  const result = await testTokenRefresh(TEST_EMAIL);
  
  if (result.refreshTriggered) {
    console.log('✅ PASS: Proactive refresh triggered');
  } else {
    console.log('❌ FAIL: Proactive refresh not triggered');
  }
  
  return result;
}

async function testNormalToken() {
  console.log('\n✅ TEST: Normal Token (>60s)');
  console.log('===============================');
  
  // Set token to expire in 90 seconds
  await setTokenExpiry(TEST_EMAIL, 90);
  
  // Test loadTokens - should NOT trigger refresh
  const result = await testTokenRefresh(TEST_EMAIL);
  
  if (!result.refreshTriggered) {
    console.log('✅ PASS: No unnecessary refresh');
  } else {
    console.log('❌ FAIL: Unexpected refresh triggered');
  }
  
  return result;
}

async function testExpiredToken() {
  console.log('\n⏰ TEST: Expired Token');
  console.log('=======================');
  
  // Set token to already be expired
  await setTokenExpiry(TEST_EMAIL, -300); // 5 minutes ago
  
  // Test loadTokens - should trigger refresh
  const result = await testTokenRefresh(TEST_EMAIL);
  
  if (result.refreshTriggered) {
    console.log('✅ PASS: Expired token refreshed');
  } else {
    console.log('❌ FAIL: Expired token not refreshed');
  }
  
  return result;
}

async function testApiEndpoint() {
  console.log('\n🌐 TEST: API Endpoint Integration');
  console.log('===================================');
  
  // Set token to expire soon
  await setTokenExpiry(TEST_EMAIL, 45);
  
  // Make API call - should auto-refresh
  const result = await simulateApiCall(TEST_EMAIL);
  
  if (result.success) {
    console.log('✅ PASS: API call successful with auto-refresh');
  } else {
    console.log('❌ FAIL: API call failed', result.error);
  }
  
  return result;
}

async function testTokenStatus() {
  console.log('\n📊 TEST: Token Status Endpoint');
  console.log('================================');
  
  try {
    const response = await fetch(`http://localhost:3001/email/token/status?email=${TEST_EMAIL}`);
    const data = await response.json();
    
    console.log('Token Status:', {
      email: data.email,
      needsRefresh: data.tokenStatus?.needsRefresh,
      expiresIn: Math.floor(data.tokenStatus?.expiresIn / 1000) + 's'
    });
    
    return { success: true, data };
  } catch (error) {
    console.log('❌ Token status check failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function monitorTokenChanges(email, duration = 120) {
  console.log(`\n👁️  MONITOR: Token changes for ${duration}s`);
  console.log('==============================================');
  
  // Set token to expire in 70 seconds
  await setTokenExpiry(email, 70);
  
  const startTime = Date.now();
  let lastCheck = null;
  
  while ((Date.now() - startTime) < duration * 1000) {
    const current = await getTokenInfo(email);
    
    if (!lastCheck || 
        current.access_token_expires_at !== lastCheck.access_token_expires_at ||
        current.refresh_attempts !== lastCheck.refresh_attempts) {
      
      const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`[${timeElapsed}s] Token info:`, {
        secondsUntilExpiry: current.seconds_until_expiry,
        refreshAttempts: current.refresh_attempts,
        lastRefresh: current.last_refresh_at
      });
    }
    
    lastCheck = current;
    await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
  }
}

async function runInteractiveTest() {
  console.log('🚀 Interactive Token Refresh Test Suite');
  console.log('========================================\n');
  
  const tests = [
    { name: 'Normal Token Test', fn: testNormalToken },
    { name: 'Proactive Refresh Test', fn: testProactiveRefresh },  
    { name: 'Expired Token Test', fn: testExpiredToken },
    { name: 'API Integration Test', fn: testApiEndpoint },
    { name: 'Token Status Test', fn: testTokenStatus },
    { name: '2-minute Monitor', fn: () => monitorTokenChanges(TEST_EMAIL, 120) }
  ];
  
  for (const test of tests) {
    console.log(`\n▶️  Running: ${test.name}`);
    try {
      await test.fn();
      console.log(`✅ ${test.name} completed\n`);
      
      // Wait between tests  
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`❌ ${test.name} failed:`, error.message, '\n');
    }
  }
  
  console.log('🏁 All tests completed!');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runInteractiveTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export {
  testProactiveRefresh,
  testNormalToken, 
  testExpiredToken,
  testApiEndpoint,
  testTokenStatus,
  monitorTokenChanges,
  runInteractiveTest
};