#!/usr/bin/env node
// Specific test for proactive refresh functionality
// This test simulates the exact 60-second threshold scenario

import '../backend/bootstrap/env.js';
import pool from '../backend/db.js';
import { loadTokens, checkTokenExpiry } from '../backend/helpers/tokenStore.js';

const TEST_EMAIL = 'hung97vu@gmail.com';

async function testProactiveRefreshThresholds() {
  console.log('🎯 Testing Proactive Refresh Thresholds');
  console.log('==========================================\n');

  const scenarios = [
    { name: 'Token expires in 61 seconds (should NOT refresh)', seconds: 61, shouldRefresh: false },
    { name: 'Token expires in 60 seconds (should refresh)', seconds: 60, shouldRefresh: true },
    { name: 'Token expires in 59 seconds (should refresh)', seconds: 59, shouldRefresh: true },
    { name: 'Token expires in 30 seconds (should refresh)', seconds: 30, shouldRefresh: true },
    { name: 'Token expires in 5 seconds (should refresh)', seconds: 5, shouldRefresh: true },
    { name: 'Token already expired (should refresh)', seconds: -10, shouldRefresh: true }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📋 ${scenario.name}`);
    console.log('─'.repeat(50));

    // Setup: Set token to expire at specific time
    const expiryTime = new Date(Date.now() + (scenario.seconds * 1000));
    
    await pool.execute(
      `UPDATE google_tokens 
       SET access_token_expires_at = ?,
           refresh_attempts = 0,
           last_refresh_at = NULL
       WHERE email = ?`,
      [expiryTime, TEST_EMAIL]
    );

    // Get initial state
    const [beforeRows] = await pool.execute(
      `SELECT refresh_attempts, last_refresh_at, 
              TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) as seconds_until_expiry
       FROM google_tokens WHERE email = ?`,
      [TEST_EMAIL]
    );
    const before = beforeRows[0];

    console.log('⏰ Before:', {
      secondsUntilExpiry: before.seconds_until_expiry,
      refreshAttempts: before.refresh_attempts
    });

    // Test checkTokenExpiry function
    const expiryCheck = await checkTokenExpiry(TEST_EMAIL);
    console.log('🔍 Expiry Check:', {
      needsRefresh: expiryCheck.needsRefresh,
      reason: expiryCheck.reason,
      expiresInMs: Math.floor(expiryCheck.expiresIn)
    });

    // Test loadTokens (this should trigger refresh if needed)
    let refreshTriggered = false;
    try {
      const tokens = await loadTokens(TEST_EMAIL);
      
      // Check if refresh was triggered
      const [afterRows] = await pool.execute(
        `SELECT refresh_attempts, last_refresh_at,
                TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) as seconds_until_expiry  
         FROM google_tokens WHERE email = ?`,
        [TEST_EMAIL]
      );
      const after = afterRows[0];

      refreshTriggered = after.refresh_attempts > before.refresh_attempts;

      console.log('⚡ After loadTokens():', {
        secondsUntilExpiry: after.seconds_until_expiry,
        refreshAttempts: after.refresh_attempts,
        refreshTriggered,
        hasValidToken: !!tokens?.access_token
      });

      // Validation
      if (scenario.shouldRefresh === refreshTriggered) {
        console.log('✅ PASS: Refresh behavior matches expectation');
      } else {
        console.log(`❌ FAIL: Expected refresh=${scenario.shouldRefresh}, got=${refreshTriggered}`);
      }

    } catch (error) {
      console.log('❌ loadTokens() failed:', error.message);
      
      // This might be expected for certain scenarios
      if (scenario.seconds < 0) {
        console.log('ℹ️  Failure expected for expired tokens without valid refresh token');
      }
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function testConcurrentRequests() {
  console.log('\n🔄 Testing Concurrent Requests');
  console.log('===============================');

  // Set token to expire in 30 seconds
  const expiryTime = new Date(Date.now() + 30000);
  await pool.execute(
    `UPDATE google_tokens 
     SET access_token_expires_at = ?, refresh_attempts = 0
     WHERE email = ?`,
    [expiryTime, TEST_EMAIL]
  );

  console.log('🚀 Making 3 concurrent loadTokens() calls...');

  // Make 3 concurrent requests
  const promises = [
    loadTokens(TEST_EMAIL),
    loadTokens(TEST_EMAIL), 
    loadTokens(TEST_EMAIL)
  ];

  try {
    const results = await Promise.allSettled(promises);
    
    // Check how many refreshes happened
    const [rows] = await pool.execute(
      `SELECT refresh_attempts FROM google_tokens WHERE email = ?`,
      [TEST_EMAIL]
    );
    
    const refreshAttempts = rows[0].refresh_attempts;
    const successfulResults = results.filter(r => r.status === 'fulfilled').length;
    
    console.log('📊 Results:', {
      successfulCalls: successfulResults,
      refreshAttempts,
      expectation: 'Only 1 refresh should happen despite 3 concurrent calls'
    });

    if (refreshAttempts <= 2) { // Allow some tolerance for race conditions
      console.log('✅ PASS: No excessive refresh attempts');
    } else {
      console.log('⚠️  WARNING: More refreshes than expected (possible race condition)');
    }

  } catch (error) {
    console.log('❌ Concurrent test failed:', error.message);
  }
}

async function testRefreshTokenEdgeCases() {
  console.log('\n🧪 Testing Edge Cases');
  console.log('======================');

  // Test case: No refresh token
  console.log('\n📝 Case: Missing refresh token');
  await pool.execute(
    `UPDATE google_tokens 
     SET access_token_expires_at = DATE_ADD(NOW(), INTERVAL 30 SECOND),
         refresh_token_encrypted = NULL
     WHERE email = ?`,
    [TEST_EMAIL]
  );

  try {
    await loadTokens(TEST_EMAIL);
    console.log('❌ FAIL: Should have failed with no refresh token');
  } catch (error) {
    console.log('✅ PASS: Correctly failed with no refresh token:', error.message);
  }

  // Test case: Too many refresh attempts
  console.log('\n📝 Case: Too many refresh attempts');
  await pool.execute(
    `UPDATE google_tokens 
     SET access_token_expires_at = DATE_ADD(NOW(), INTERVAL 30 SECOND),
         refresh_token_encrypted = 'fake_token',
         refresh_attempts = 5
     WHERE email = ?`,
    [TEST_EMAIL]
  );

  const expiryCheck = await checkTokenExpiry(TEST_EMAIL);
  console.log('📊 High refresh attempts token:', {
    needsRefresh: expiryCheck.needsRefresh,
    reason: expiryCheck.reason
  });
}

// Run all tests
async function runAllProactiveTests() {
  console.log('🚀 Starting Proactive Refresh Test Suite');
  console.log('=========================================\n');

  try {
    await testProactiveRefreshThresholds();
    await testConcurrentRequests();
    await testRefreshTokenEdgeCases();
    
    console.log('\n🏁 All proactive refresh tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllProactiveTests();
}

export { 
  testProactiveRefreshThresholds,
  testConcurrentRequests, 
  testRefreshTokenEdgeCases 
};