import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Luôn trỏ về thư mục gốc project
const rootDir = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: rootDir });
