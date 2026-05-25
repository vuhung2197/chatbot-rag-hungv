import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..', '..');
const envPath = path.join(rootDir, '.env');

// Fallback: nếu path resolve sai (ví dụ eval context), dùng /app/.env
const resolvedPath = envPath.startsWith('/app') ? envPath : '/app/.env';

console.log('Loading .env from:', resolvedPath);
dotenv.config({ path: resolvedPath, override: false });
