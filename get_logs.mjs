import { execSync } from 'child_process';
const logs = execSync('docker logs chatbot-backend --tail 100 2>&1', { encoding: 'utf-8' });
const lines = logs.split('\n');
const errorIndex = lines.findIndex(l => l.includes('TypeError: Cannot read properties of undefined'));
if (errorIndex !== -1) {
    console.log('--- ERROR STACK ---');
    console.log(lines.slice(Math.max(0, errorIndex - 2), errorIndex + 15).join('\n'));
} else {
    console.log('No TypeError found in last 100 lines');
    console.log(lines.slice(-20).join('\n'));
}
