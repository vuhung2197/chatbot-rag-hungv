import { z } from 'zod';

// ─── Register ───
export const registerSchema = {
    body: z.object({
        name: z.string()
            .min(2, 'Name too short')
            .max(50, 'Name too long')
            .trim(),
        email: z.string()
            .email('Invalid email format')
            .toLowerCase()
            .trim(),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain an uppercase letter')
            .regex(/[0-9]/, 'Password must contain a number')
    })
};

// ─── Login ───
export const loginSchema = {
    body: z.object({
        email: z.string()
            .email('Invalid email format')
            .toLowerCase()
            .trim(),
        password: z.string()
            .min(1, 'Password is required')
    })
};

// ─── OAuth Provider (link/unlink) ───
export const oauthProviderSchema = {
    params: z.object({
        provider: z.enum(['google', 'github', 'microsoft'], {
            error: 'Provider must be one of: google, github, microsoft'
        })
    })
};
