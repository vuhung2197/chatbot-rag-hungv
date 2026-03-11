import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../../../.env');
console.log('[Settings] ENV_PATH resolved to:', ENV_PATH, '| exists:', fs.existsSync(ENV_PATH));

// All config keys
const CONFIG_KEYS = [
    // Public/OAuth
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    // AI/Search
    'OPENAI_API_KEY', 'TAVILY_API_KEY',
    // Database
    'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE',
    // Core/Auth
    'JWT_SECRET', 'HMAC_KEY', 'FRONTEND_URL', 'PORT',
    // Email
    'EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM_NAME',
    // Payment: VNPay
    'VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_URL', 'VNPAY_RETURN_URL',
    // Payment: MoMo
    'MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_ENDPOINT', 'MOMO_REDIRECT_URL', 'MOMO_IPN_URL'
];

// Keys that are publicly readable (before login)
const PUBLIC_KEYS = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
];

// Helper: parse .env file directly (source of truth)
const parseEnvFile = () => {
    const parsed = {};
    if (fs.existsSync(ENV_PATH)) {
        const content = fs.readFileSync(ENV_PATH, 'utf8');
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (match) parsed[match[1].trim()] = match[2].trim();
        });
    }
    return parsed;
};

export const getPublicEnvKeys = (req, res) => {
    try {
        const parsedEnv = parseEnvFile();
        const config = {};
        PUBLIC_KEYS.forEach(key => {
            config[key] = parsedEnv[key] || '';
        });
        res.json(config);
    } catch (error) {
        console.error('Error fetching public env keys:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updatePublicEnvKeys = (req, res) => {
    handleEnvUpdate(req, res, PUBLIC_KEYS);
};

export const getEnvKeys = (req, res) => {
    try {
        const parsedEnv = parseEnvFile();
        const config = {};
        CONFIG_KEYS.forEach(key => {
            config[key] = parsedEnv[key] || '';
        });
        res.json(config);
    } catch (error) {
        console.error('Error fetching env keys:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateEnvKeys = (req, res) => {
    handleEnvUpdate(req, res, CONFIG_KEYS);
};

const handleEnvUpdate = (req, res, allowedKeys) => {
    try {
        const updates = req.body;
        
        let envContent = '';
        if (fs.existsSync(ENV_PATH)) {
            envContent = fs.readFileSync(ENV_PATH, 'utf8');
        } else {
            console.warn(`.env file not found at ${ENV_PATH}, creating new one.`);
        }

        let lines = envContent.split('\n');

        Object.keys(updates).forEach(key => {
            if (!allowedKeys.includes(key)) return; 
            
            const value = updates[key];
            // Update dynamically in memory so server restart isn't required 
            process.env[key] = value; 

            // Update file content
            const regex = new RegExp(`^${key}=.*$`);
            const index = lines.findIndex(line => regex.test(line.trim()));
            if (index !== -1) {
                lines[index] = `${key}=${value}`;
            } else {
                lines.push(`${key}=${value}`);
            }
        });

        // Remove empty strings from end just in case
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }

        fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf8');

        res.json({ message: 'Environment variables updated successfully' });
    } catch (error) {
        console.error('Error updating env keys:', error);
        res.status(500).json({ message: 'Failed to update environment variables' });
    }
};
