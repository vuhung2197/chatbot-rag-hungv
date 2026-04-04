import { ZodError } from 'zod';

/**
 * Factory function tạo validation middleware
 * @param {Object} schemas - { body?, query?, params? } — mỗi thuộc tính là 1 Zod schema
 * @returns {Function} Express middleware
 * 
 * @example
 * import { validate } from '#shared/middlewares/validate.middleware.js';
 * import { z } from 'zod';
 * 
 * const schema = {
 *     body: z.object({ amount: z.number().positive() }),
 *     query: z.object({ page: z.coerce.number().int().positive().optional() }),
 * };
 * 
 * router.post('/deposit', validate(schema), createDeposit);
 */
export function validate(schemas) {
    return (req, res, next) => {
        try {
            if (schemas.body) req.body = schemas.body.parse(req.body);
            if (schemas.query) req.query = schemas.query.parse(req.query);
            if (schemas.params) req.params = schemas.params.parse(req.params);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: error.issues.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
}
