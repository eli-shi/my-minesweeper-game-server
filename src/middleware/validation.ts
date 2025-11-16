import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

const formatZodError = (error: ZodError) =>
    error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
    }));

const withValidation =
    (schema: ZodTypeAny, property: 'body' | 'query' | 'params') =>
        (req: Request, res: Response, next: NextFunction) => {
            try {
                console.log(`Validating ${property}:`, req[property]);
                const result = schema.parse(req[property]);
                (req as any)[property] = result;
                next();
            } catch (error) {
                if (error instanceof ZodError) {
                    console.error('Validation error:', formatZodError(error));
                    return res.status(400).json({
                        error: 'Validation failed',
                        details: formatZodError(error),
                    });
                }
                return res.status(400).json({ error: 'Validation failed' });
            }
        };

export const validateBody = (schema: ZodTypeAny) => withValidation(schema, 'body');
export const validateQuery = (schema: ZodTypeAny) => withValidation(schema, 'query');
export const validateParams = (schema: ZodTypeAny) => withValidation(schema, 'params');

