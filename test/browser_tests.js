// Browser console testing utilities
// Paste these functions into browser console when on your app

// Test API calls from browser
async function testEmailAPI() {
  console.log('🧪 Testing Email API from browser...');
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No auth token found in localStorage');
    return;
  }
  
  try {
    const response = await fetch('/api/email/gmail', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    console.log('📡 API Response:', {
      status: response.status,
      dataCount: data.data?.length || 0,
      tokenInfo: data.tokenInfo
    });
    
    if (data.tokenInfo) {
      const expiresIn = data.tokenInfo.timeUntilExpiry;
      console.log(`🔐 Token expires in: ${expiresIn}s (${Math.floor(expiresIn/60)}m ${expiresIn%60}s)`);
      
      if (expiresIn < 120) {
        console.warn('⚠️  Token expires soon - should refresh on next call');
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ API call failed:', error);
    return null;
  }
}

// Test token status endpoint
async function checkTokenStatus() {
  console.log('📊 Checking token status...');
  
  try {
    const response = await fetch('/api/email/token/status?email=hung97vu@gmail.com');
    const data = await response.json();
    
    console.log('Token Status:', data);
    
    const { tokenStatus } = data;
    if (tokenStatus.needsRefresh) {
      console.warn(`⚠️  Token needs refresh: ${tokenStatus.reason}`);
    } else {
      console.log(`✅ Token is valid for ${Math.floor(tokenStatus.expiresIn/1000)}s`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Token status check failed:', error);
    return null;
  }
}

// Monitor token changes over time
async function monitorTokens(intervalSeconds = 10, durationMinutes = 5) {
  console.log(`👁️  Monitoring tokens every ${intervalSeconds}s for ${durationMinutes}m`);
  
  const startTime = Date.now();
  const duration = durationMinutes * 60 * 1000;
  let lastTokenInfo = null;
  
  const monitor = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      const status = await checkTokenStatus();
      const currentExpiry = status.tokenStatus?.expiresIn;
      
      // Log if token info changed
      if (!lastTokenInfo || Math.abs(currentExpiry - lastTokenInfo) > 1000) {
        console.log(`[${elapsed}s] Token expires in: ${Math.floor(currentExpiry/1000)}s`);
        
        if (currentExpiry < 60000) {
          console.log('🔄 Token should refresh on next API call!');
        }
      }
      
      lastTokenInfo = currentExpiry;
      
      // Stop after duration
      if (Date.now() - startTime > duration) {
        clearInterval(monitor);
        console.log('🏁 Monitoring completed');
      }
      
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }, intervalSeconds * 1000);
  
  return monitor;
}

// Test refresh trigger by making multiple API calls
async function testRefreshTrigger() {
  console.log('🔄 Testing refresh trigger with multiple API calls...');
  
  // Make initial call to get token info
  const initial = await testEmailAPI();
  if (!initial?.tokenInfo) {
    console.error('❌ Could not get initial token info');
    return;
  }
  
  const initialExpiry = initial.tokenInfo.timeUntilExpiry;
  console.log(`Initial token expires in: ${initialExpiry}s`);
  
  // Wait and make another call
  console.log('Waiting 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const second = await testEmailAPI();
  if (second?.tokenInfo) {
    const secondExpiry = second.tokenInfo.timeUntilExpiry;
    console.log(`Second call - token expires in: ${secondExpiry}s`);
    
    // If token was refreshed, expiry should be much higher
    if (secondExpiry > initialExpiry + 3000) {
      console.log('✅ Token was refreshed between calls!');
    } else {
      console.log('ℹ️  Token was not refreshed (expected if >60s remaining)');
    }
  }
}

// Test sequence: force token to near expiry and trigger refresh
async function simulateExpiryScenario() {
  console.log('⏰ Simulating token expiry scenario...');
  console.log('Note: This requires manually setting token expiry in database');
  
  // Instructions for user
  console.log(`
🛠️  Manual Steps Required:
1. Open MySQL and run:
   UPDATE google_tokens 
   SET access_token_expires_at = DATE_ADD(NOW(), INTERVAL 45 SECOND)
   WHERE email = 'hung97vu@gmail.com';

2. Then run: testEmailAPI() 
3. Token should auto-refresh and you'll see new expiry time
  `);
  
  // Monitor for changes
  return monitorTokens(5, 2); // 5s intervals for 2 minutes
}

// Export functions to window for browser console use
if (typeof window !== 'undefined') {
  window.testEmailAPI = testEmailAPI;
  window.checkTokenStatus = checkTokenStatus; 
  window.monitorTokens = monitorTokens;
  window.testRefreshTrigger = testRefreshTrigger;
  window.simulateExpiryScenario = simulateExpiryScenario;
  
  console.log(`
🧪 Browser Test Functions Available:
• testEmailAPI() - Test email API call
• checkTokenStatus() - Check token expiry status  
• monitorTokens(interval, duration) - Monitor token changes
• testRefreshTrigger() - Test refresh between API calls
• simulateExpiryScenario() - Full expiry simulation

Example usage:
testEmailAPI().then(data => console.log('Result:', data));
  `);
}