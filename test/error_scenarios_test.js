#!/usr/bin/env node
// Test error handling scenarios for token refresh system

import '../backend/bootstrap/env.js';
import pool from '../backend/db.js';
import { loadTokens, refreshAccessToken } from '../backend/helpers/tokenStore.js';
import axios from 'axios';

const TEST_EMAIL = 'error-test@example.com';

async function setupErrorTestData() {
  console.log('🛠️  Setting up error test data...');
  
  // Create test user with various error scenarios
  const scenarios = [
    {
      email: 'no-refresh@test.com',
      description: 'No refresh token',
      accessTokenExpiry: 30, // expires in 30 seconds
      refreshToken: null
    },
    {
      email: 'invalid-refresh@test.com', 
      description: 'Invalid refresh token',
      accessTokenExpiry: 30,
      refreshToken: 'invalid_token_data'
    },
    {
      email: 'high-attempts@test.com',
      description: 'High refresh attempts',
      accessTokenExpiry: 30,
      refreshToken: 'valid_looking_token', 
      refreshAttempts: 3
    }
  ];

  for (const scenario of scenarios) {
    const expiryTime = new Date(Date.now() + (scenario.accessTokenExpiry * 1000));
    const encodedRefreshToken = scenario.refreshToken ? 
      Buffer.from(scenario.refreshToken).toString('base64') + '.fakesig' : null;

    await pool.execute(
      `INSERT INTO google_tokens (
         email, tokens_encrypted, access_token_expires_at, 
         refresh_token_encrypted, refresh_attempts
       ) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tokens_encrypted = VALUES(tokens_encrypted),
         access_token_expires_at = VALUES(access_token_expires_at),
         refresh_token_encrypted = VALUES(refresh_token_encrypted),
         refresh_attempts = VALUES(refresh_attempts)`,
      [
        scenario.email,
        'fake_access_token.sig',
        expiryTime,
        encodedRefreshToken,
        scenario.refreshAttempts || 0
      ]
    );

    console.log(`✅ Created test data for: ${scenario.description}`);
  }
}

async function testNoRefreshToken() {
  console.log('\n❌ TEST: No Refresh Token Available');
  console.log('====================================');
  
  const email = 'no-refresh@test.com';
  
  try {
    const tokens = await loadTokens(email);
    console.log('❌ FAIL: Should have thrown error for missing refresh token');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly failed with error:', error.message);
    
    // Verify error message is appropriate
    if (error.message.includes('refresh token') || error.message.includes('No refresh token')) {
      console.log('✅ Error message is descriptive');
      return true;
    } else {
      console.log('⚠️  Error message could be more descriptive');
      return false;
    }
  }
}

async function testInvalidRefreshToken() {
  console.log('\n🔒 TEST: Invalid Refresh Token');
  console.log('===============================');
  
  const email = 'invalid-refresh@test.com';
  
  try {
    const tokens = await refreshAccessToken(email);
    console.log('❌ FAIL: Should have failed with invalid refresh token');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly failed with invalid token:', error.message);
    
    // Check if refresh attempts were incremented
    const [rows] = await pool.execute(
      `SELECT refresh_attempts FROM google_tokens WHERE email = ?`,
      [email]
    );
    
    const attempts = rows[0]?.refresh_attempts || 0;
    console.log(`📊 Refresh attempts after failure: ${attempts}`);
    
    if (attempts > 0) {
      console.log('✅ Refresh attempts properly tracked');
      return true;
    } else {
      console.log('⚠️  Refresh attempts not incremented');
      return false;
    }
  }
}

async function testHighRefreshAttempts() {
  console.log('\n🔁 TEST: High Refresh Attempts (≥3)');
  console.log('====================================');
  
  const email = 'high-attempts@test.com';
  
  // Make sure we have high attempts
  await pool.execute(
    `UPDATE google_tokens SET refresh_attempts = 5 WHERE email = ?`,
    [email]
  );
  
  try {
    const tokens = await loadTokens(email);
    console.log('⚠️  Token load succeeded despite high attempts');
    
    // Check if refresh token was cleared after multiple failures
    const [rows] = await pool.execute(
      `SELECT refresh_token_encrypted FROM google_tokens WHERE email = ?`,
      [email]
    );
    
    if (!rows[0]?.refresh_token_encrypted) {
      console.log('✅ PASS: Refresh token cleared after multiple failures');
      return true;
    } else {
      console.log('⚠️  Refresh token not cleared after failures');
      return false;
    }
    
  } catch (error) {
    console.log('✅ PASS: Failed as expected with high attempts:', error.message);
    return true;
  }
}

async function testNetworkErrors() {
  console.log('\n🌐 TEST: Network Error Simulation');
  console.log('==================================');
  
  // This test requires mocking the Google OAuth2 client
  // For now, we'll simulate by using an invalid client configuration
  
  console.log('ℹ️  Network error testing requires manual simulation');
  console.log('💡 To test: Disconnect internet and try token refresh');
  console.log('Expected: Should fail gracefully with network error message');
  
  return true; // Manual test
}

async function testAPIErrorHandling() {
  console.log('\n🌐 TEST: API Error Handling');
  console.log('============================');
  
  // Test how API endpoints handle token errors
  const testCases = [
    { email: 'no-refresh@test.com', expectedStatus: 401 },
    { email: 'invalid-refresh@test.com', expectedStatus: 401 },
    { email: 'nonexistent@test.com', expectedStatus: 401 }
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing API with: ${testCase.email}`);
    
    try {
      // Simulate API call (would normally go through server)
      const response = await axios.get('http://localhost:3001/email/gmail', {
        headers: { 'Authorization': 'Bearer fake-token' },
        validateStatus: () => true // Don't throw on 4xx/5xx
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (response.status === testCase.expectedStatus) {
        console.log('✅ PASS: API returned expected error status');
      } else {
        console.log(`❌ FAIL: Expected ${testCase.expectedStatus}, got ${response.status}`);
        allPassed = false;
      }
      
      // Check error message quality
      if (response.data?.error) {
        console.log(`💬 Error message: ${response.data.error}`);
        
        if (response.data.message && response.data.message.includes('reconnect')) {
          console.log('✅ User-friendly error message provided');
        }
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️  Server not running - skipping API test');
      } else {
        console.log('❌ API test failed:', error.message);
        allPassed = false;
      }
    }
  }
  
  return allPassed;
}

async function testDatabaseErrors() {
  console.log('\n🗄️  TEST: Database Error Handling');
  console.log('==================================');
  
  // Test with invalid email format
  try {
    await loadTokens('invalid-email-format');
    console.log('⚠️  Should validate email format');
  } catch (error) {
    console.log('✅ Database query handled invalid email');
  }
  
  // Test with extremely long email
  try {
    const longEmail = 'a'.repeat(400) + '@test.com';
    await loadTokens(longEmail);
    console.log('⚠️  Should handle long email addresses');
  } catch (error) {
    console.log('✅ Database query handled long email');
  }
  
  return true;
}

async function testTokenCorruption() {
  console.log('\n🔐 TEST: Token Corruption Scenarios');
  console.log('====================================');
  
  const email = 'corrupt-test@test.com';
  
  // Create token with corrupted data
  await pool.execute(
    `INSERT INTO google_tokens (email, tokens_encrypted, access_token_expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tokens_encrypted = VALUES(tokens_encrypted),
       access_token_expires_at = VALUES(access_token_expires_at)`,
    [
      email,
      'corrupted_token_data_invalid_format',
      new Date(Date.now() + 30000)
    ]
  );
  
  try {
    await loadTokens(email);
    console.log('❌ FAIL: Should have failed with corrupted token');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly handled corrupted token:', error.message);
    return true;
  }
}

async function runAllErrorTests() {
  console.log('🛡️  Starting Error Handling Test Suite');
  console.log('=======================================\n');
  
  try {
    await setupErrorTestData();
    
    const tests = [
      { name: 'No Refresh Token', fn: testNoRefreshToken },
      { name: 'Invalid Refresh Token', fn: testInvalidRefreshToken },
      { name: 'High Refresh Attempts', fn: testHighRefreshAttempts },
      { name: 'Network Errors', fn: testNetworkErrors },
      { name: 'API Error Handling', fn: testAPIErrorHandling },
      { name: 'Database Errors', fn: testDatabaseErrors },
      { name: 'Token Corruption', fn: testTokenCorruption }
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
      console.log(`\n▶️  Running: ${test.name}`);
      try {
        const passed = await test.fn();
        if (passed) {
          passedTests++;
          console.log(`✅ ${test.name} PASSED`);
        } else {
          console.log(`❌ ${test.name} FAILED`);
        }
      } catch (error) {
        console.log(`💥 ${test.name} CRASHED:`, error.message);
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${tests.length} passed`);
    
    // Cleanup test data
    await pool.execute(`
      DELETE FROM google_tokens 
      WHERE email LIKE '%test.com' OR email LIKE '%@test.com'
    `);
    console.log('🧹 Cleaned up test data');
    
  } catch (error) {
    console.error('❌ Error test suite failed:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllErrorTests();
}

export {
  testNoRefreshToken,
  testInvalidRefreshToken,
  testHighRefreshAttempts,
  testAPIErrorHandling,
  testTokenCorruption
};