// Token testing utilities
import pool from '../backend/db.js';
import { loadTokens, checkTokenExpiry, refreshAccessToken } from '../backend/helpers/tokenStore.js';

export async function setTokenExpiry(email, secondsFromNow) {
  const expiryTime = new Date(Date.now() + (secondsFromNow * 1000));
  
  await pool.execute(
    `UPDATE google_tokens 
     SET access_token_expires_at = ?
     WHERE email = ?`,
    [expiryTime, email]
  );
  
  console.log(`✅ Set ${email} token to expire in ${secondsFromNow} seconds`);
  return expiryTime;
}

export async function getTokenInfo(email) {
  const [rows] = await pool.execute(
    `SELECT 
       email,
       access_token_expires_at,
       TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) as seconds_until_expiry,
       refresh_attempts,
       last_refresh_at,
       updated_at
     FROM google_tokens 
     WHERE email = ?`,
    [email]
  );
  
  return rows[0] || null;
}

export async function testTokenRefresh(email) {
  console.log(`\n🧪 Testing token refresh for ${email}`);
  
  // Before
  const before = await getTokenInfo(email);
  console.log('📊 Before:', {
    expiresAt: before?.access_token_expires_at,
    secondsUntilExpiry: before?.seconds_until_expiry,
    refreshAttempts: before?.refresh_attempts
  });
  
  try {
    // Test load tokens (should trigger refresh if needed)
    const tokens = await loadTokens(email);
    
    // After 
    const after = await getTokenInfo(email);
    console.log('📊 After:', {
      expiresAt: after?.access_token_expires_at,
      secondsUntilExpiry: after?.seconds_until_expiry, 
      refreshAttempts: after?.refresh_attempts,
      lastRefreshAt: after?.last_refresh_at
    });
    
    return {
      success: true,
      tokens,
      before,
      after,
      refreshTriggered: after?.refresh_attempts > before?.refresh_attempts
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message,
      before
    };
  }
}

export async function simulateApiCall(email) {
  console.log(`\n🌐 Simulating API call for ${email}`);
  
  try {
    const response = await fetch(`http://localhost:3001/email/gmail`, {
      headers: {
        'Authorization': 'Bearer fake-jwt-token'
      }
    });
    
    const data = await response.json();
    console.log('📡 API Response:', {
      status: response.status,
      hasData: !!data.data,
      tokenInfo: data.tokenInfo
    });
    
    return { success: response.ok, data };
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runTestScenarios() {
  console.log('🚀 Starting comprehensive token refresh tests...\n');
  
  const scenarios = [
    {
      name: 'Token expires in 30s (should refresh)',
      email: 'test@example.com', 
      expirySeconds: 30
    },
    {
      name: 'Token expires in 90s (should not refresh)',
      email: 'test@example.com',
      expirySeconds: 90  
    },
    {
      name: 'Token already expired (should refresh)',
      email: 'test@example.com',
      expirySeconds: -10
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n==== ${scenario.name} ====`);
    
    // Setup
    await setTokenExpiry(scenario.email, scenario.expirySeconds);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test
    const result = await testTokenRefresh(scenario.email);
    console.log('🎯 Result:', result.success ? 'PASS' : 'FAIL');
    
    if (scenario.expirySeconds < 60 && result.success) {
      console.log(result.refreshTriggered ? '✅ Refresh triggered as expected' : '⚠️ Refresh not triggered');
    }
  }
}

// Export for use in tests
export { pool };