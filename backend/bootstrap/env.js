import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to project root .env file
const rootDir = path.resolve(__dirname, '..', '..');
const envPath = path.join(rootDir, '.env');

console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });
