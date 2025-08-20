#!/usr/bin/env node
// Monitoring and verification tools for token refresh system

import '../backend/bootstrap/env.js';
import pool from '../backend/db.js';
import { checkTokenExpiry } from '../backend/helpers/tokenStore.js';

// Real-time token monitoring dashboard
async function tokenMonitorDashboard(intervalSeconds = 10) {
  console.log('📊 Token Monitoring Dashboard');
  console.log('=============================\n');
  
  const monitor = setInterval(async () => {
    console.clear(); // Clear screen for real-time updates
    console.log('📊 Token Monitoring Dashboard - ' + new Date().toLocaleTimeString());
    console.log('='.repeat(60));
    
    try {
      // Get all active tokens
      const [tokens] = await pool.execute(`
        SELECT 
          email,
          access_token_expires_at,
          TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) as seconds_until_expiry,
          refresh_attempts,
          last_refresh_at,
          updated_at,
          CASE 
            WHEN refresh_token_encrypted IS NULL THEN 'No Refresh Token'
            WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) < 0 THEN 'EXPIRED'
            WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) < 60 THEN 'EXPIRING SOON'
            WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) < 300 THEN 'WARNING'
            ELSE 'OK'
          END as status
        FROM google_tokens 
        ORDER BY access_token_expires_at ASC
      `);
      
      if (tokens.length === 0) {
        console.log('No tokens found in database');
        return;
      }
      
      // Display token status table
      console.log('\n📋 Token Status:');
      console.log('─'.repeat(100));
      console.log('EMAIL                    | STATUS        | EXPIRES IN  | REFRESH ATTEMPTS | LAST REFRESH');
      console.log('─'.repeat(100));
      
      for (const token of tokens) {
        const email = token.email.padEnd(24);
        const status = token.status.padEnd(13);
        const expiresIn = formatDuration(token.seconds_until_expiry).padEnd(11);
        const attempts = String(token.refresh_attempts).padEnd(16);
        const lastRefresh = token.last_refresh_at ? 
          token.last_refresh_at.toLocaleTimeString() : 'Never';
        
        // Color coding for status
        const statusColor = getStatusColor(token.status);
        console.log(`${email} | ${statusColor}${status}\x1b[0m | ${expiresIn} | ${attempts} | ${lastRefresh}`);
      }
      
      // Summary statistics
      const summary = {
        total: tokens.length,
        ok: tokens.filter(t => t.status === 'OK').length,
        warning: tokens.filter(t => t.status === 'WARNING').length,
        expiringSoon: tokens.filter(t => t.status === 'EXPIRING SOON').length,
        expired: tokens.filter(t => t.status === 'EXPIRED').length,
        noRefreshToken: tokens.filter(t => t.status === 'No Refresh Token').length
      };
      
      console.log('\n📈 Summary:');
      console.log(`Total: ${summary.total} | OK: ${summary.ok} | Warning: ${summary.warning} | Expiring Soon: ${summary.expiringSoon} | Expired: ${summary.expired}`);
      
      if (summary.noRefreshToken > 0) {
        console.log(`⚠️  ${summary.noRefreshToken} tokens missing refresh token`);
      }
      
      // Show recent refresh activity
      const [recentRefreshes] = await pool.execute(`
        SELECT email, last_refresh_at, refresh_attempts
        FROM google_tokens 
        WHERE last_refresh_at IS NOT NULL 
        ORDER BY last_refresh_at DESC 
        LIMIT 3
      `);
      
      if (recentRefreshes.length > 0) {
        console.log('\n🔄 Recent Refresh Activity:');
        for (const refresh of recentRefreshes) {
          const timeAgo = Math.floor((Date.now() - refresh.last_refresh_at.getTime()) / 1000);
          console.log(`  ${refresh.email}: ${formatDuration(timeAgo)} ago (${refresh.refresh_attempts} attempts)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Monitoring error:', error.message);
    }
  }, intervalSeconds * 1000);
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    clearInterval(monitor);
    console.log('\n👋 Monitoring stopped');
    process.exit(0);
  });
  
  return monitor;
}

function getStatusColor(status) {
  switch (status) {
    case 'OK': return '\x1b[32m'; // Green
    case 'WARNING': return '\x1b[33m'; // Yellow
    case 'EXPIRING SOON': return '\x1b[35m'; // Magenta
    case 'EXPIRED': return '\x1b[31m'; // Red
    case 'No Refresh Token': return '\x1b[31m'; // Red
    default: return '\x1b[0m'; // Reset
  }
}

function formatDuration(seconds) {
  if (seconds < 0) return `${Math.abs(seconds)}s ago`;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

async function generateTokenReport() {
  console.log('📊 Token System Health Report');
  console.log('===============================\n');
  
  try {
    // Overall statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_tokens,
        COUNT(refresh_token_encrypted) as tokens_with_refresh,
        SUM(CASE WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) < 0 THEN 1 ELSE 0 END) as expired_tokens,
        SUM(CASE WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) BETWEEN 0 AND 60 THEN 1 ELSE 0 END) as expiring_soon,
        SUM(refresh_attempts) as total_refresh_attempts,
        AVG(refresh_attempts) as avg_refresh_attempts,
        COUNT(CASE WHEN last_refresh_at IS NOT NULL THEN 1 END) as tokens_refreshed_before
      FROM google_tokens
    `);
    
    const stat = stats[0];
    console.log('🔍 System Overview:');
    console.log(`  Total Tokens: ${stat.total_tokens}`);
    console.log(`  Tokens with Refresh: ${stat.tokens_with_refresh}/${stat.total_tokens}`);
    console.log(`  Expired Tokens: ${stat.expired_tokens}`);
    console.log(`  Expiring Soon (<60s): ${stat.expiring_soon}`);
    console.log(`  Total Refresh Attempts: ${stat.total_refresh_attempts}`);
    console.log(`  Average Refresh Attempts: ${Number(stat.avg_refresh_attempts).toFixed(2)}`);
    console.log(`  Previously Refreshed: ${stat.tokens_refreshed_before}`);
    
    // Health score calculation
    const healthScore = calculateHealthScore(stat);
    console.log(`\n🏥 System Health Score: ${healthScore}% ${getHealthEmoji(healthScore)}`);
    
    // Token expiry distribution
    const [distribution] = await pool.execute(`
      SELECT 
        CASE 
          WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) < 0 THEN 'Expired'
          WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) BETWEEN 0 AND 60 THEN '0-1 min'
          WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) BETWEEN 61 AND 300 THEN '1-5 min'
          WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) BETWEEN 301 AND 900 THEN '5-15 min'
          WHEN TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) BETWEEN 901 AND 3600 THEN '15-60 min'
          ELSE '60+ min'
        END as time_range,
        COUNT(*) as count
      FROM google_tokens
      GROUP BY time_range
      ORDER BY 
        CASE time_range
          WHEN 'Expired' THEN 1
          WHEN '0-1 min' THEN 2
          WHEN '1-5 min' THEN 3
          WHEN '5-15 min' THEN 4
          WHEN '15-60 min' THEN 5
          ELSE 6
        END
    `);
    
    console.log('\n⏰ Token Expiry Distribution:');
    for (const dist of distribution) {
      const bar = '█'.repeat(Math.min(dist.count * 2, 20));
      console.log(`  ${dist.time_range.padEnd(10)}: ${dist.count.toString().padStart(3)} ${bar}`);
    }
    
    // Problem tokens
    const [problemTokens] = await pool.execute(`
      SELECT email, refresh_attempts, 
             TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) as seconds_until_expiry,
             refresh_token_encrypted IS NULL as missing_refresh_token
      FROM google_tokens
      WHERE refresh_attempts >= 3 
         OR TIMESTAMPDIFF(SECOND, NOW(), access_token_expires_at) < 0
         OR refresh_token_encrypted IS NULL
      ORDER BY refresh_attempts DESC, seconds_until_expiry ASC
      LIMIT 5
    `);
    
    if (problemTokens.length > 0) {
      console.log('\n⚠️  Problem Tokens (Needs Attention):');
      for (const token of problemTokens) {
        const issues = [];
        if (token.refresh_attempts >= 3) issues.push(`${token.refresh_attempts} refresh attempts`);
        if (token.seconds_until_expiry < 0) issues.push('expired');
        if (token.missing_refresh_token) issues.push('no refresh token');
        
        console.log(`  ${token.email}: ${issues.join(', ')}`);
      }
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (stat.expired_tokens > 0) {
      console.log(`  • ${stat.expired_tokens} expired tokens need refresh or cleanup`);
    }
    if (stat.tokens_with_refresh < stat.total_tokens) {
      const missing = stat.total_tokens - stat.tokens_with_refresh;
      console.log(`  • ${missing} tokens missing refresh capability - users need to re-authenticate`);
    }
    if (stat.avg_refresh_attempts > 1) {
      console.log('  • High average refresh attempts - check Google API connectivity');
    }
    if (problemTokens.length > 0) {
      console.log(`  • ${problemTokens.length} tokens need manual intervention`);
    }
    
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
  }
}

function calculateHealthScore(stats) {
  let score = 100;
  
  // Deduct for expired tokens
  if (stats.expired_tokens > 0) {
    score -= Math.min(stats.expired_tokens * 20, 40);
  }
  
  // Deduct for missing refresh tokens
  const missingRefreshRatio = (stats.total_tokens - stats.tokens_with_refresh) / stats.total_tokens;
  score -= missingRefreshRatio * 30;
  
  // Deduct for high refresh attempts
  if (stats.avg_refresh_attempts > 2) {
    score -= Math.min((stats.avg_refresh_attempts - 2) * 10, 20);
  }
  
  // Deduct for tokens expiring soon
  if (stats.expiring_soon > 0) {
    score -= Math.min(stats.expiring_soon * 5, 10);
  }
  
  return Math.max(Math.floor(score), 0);
}

function getHealthEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

async function testTokenSystemIntegrity() {
  console.log('🔍 Testing Token System Integrity');
  console.log('==================================\n');
  
  const tests = [
    {
      name: 'Database Schema Validation',
      test: async () => {
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'google_tokens' AND TABLE_SCHEMA = DATABASE()
        `);
        
        const requiredColumns = [
          'email', 'tokens_encrypted', 'access_token_expires_at',
          'refresh_token_encrypted', 'refresh_attempts', 'last_refresh_at'
        ];
        
        const existingColumns = columns.map(c => c.COLUMN_NAME);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length === 0) {
          console.log('✅ All required columns present');
          return true;
        } else {
          console.log('❌ Missing columns:', missingColumns);
          return false;
        }
      }
    },
    {
      name: 'Token Encryption Validation',
      test: async () => {
        const [tokens] = await pool.execute(`
          SELECT tokens_encrypted FROM google_tokens LIMIT 1
        `);
        
        if (tokens.length > 0) {
          const encrypted = tokens[0].tokens_encrypted.toString();
          if (encrypted.includes('.') && encrypted.length > 20) {
            console.log('✅ Token encryption format valid');
            return true;
          } else {
            console.log('❌ Invalid token encryption format');
            return false;
          }
        } else {
          console.log('⚠️  No tokens to validate');
          return true;
        }
      }
    },
    {
      name: 'Index Performance Check',
      test: async () => {
        const [indexes] = await pool.execute(`
          SHOW INDEX FROM google_tokens WHERE Key_name = 'idx_token_expiry'
        `);
        
        if (indexes.length > 0) {
          console.log('✅ Token expiry index exists');
          return true;
        } else {
          console.log('⚠️  Token expiry index missing - may impact performance');
          return false;
        }
      }
    }
  ];
  
  let passedTests = 0;
  for (const test of tests) {
    console.log(`\n🧪 ${test.name}:`);
    try {
      const passed = await test.test();
      if (passed) passedTests++;
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
  }
  
  console.log(`\n📊 Integrity Score: ${passedTests}/${tests.length} tests passed`);
  return passedTests === tests.length;
}

// Main CLI interface
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'monitor':
      await tokenMonitorDashboard();
      break;
    case 'report':
      await generateTokenReport();
      process.exit(0);
      break;
    case 'integrity':
      await testTokenSystemIntegrity();
      process.exit(0);
      break;
    default:
      console.log('🛠️  Token Monitoring Tools');
      console.log('========================');
      console.log('Usage: node monitoring_tools.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  monitor    - Real-time token monitoring dashboard');
      console.log('  report     - Generate comprehensive token report');
      console.log('  integrity  - Test system integrity');
      process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export {
  tokenMonitorDashboard,
  generateTokenReport,
  testTokenSystemIntegrity
};