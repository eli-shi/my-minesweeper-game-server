import { z } from 'zod';

const firebaseIdTokenSchema = z.string().min(100, 'ID token must be a valid Firebase JWT');

const difficultyEnum = z.enum(['easy', 'medium', 'hard']);

const cellSchema = z.object({
    isMine: z.boolean(),
    adjacentMines: z.number().int().min(0),
});

const boardSchema = z.array(z.array(cellSchema));
const booleanMatrixSchema = z.array(z.array(z.boolean()));

const isoDateSchema = z.preprocess((value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || value instanceof String) {
        const date = new Date(value as string);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }
    return value;
}, z.date());

const coerceNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? value : parsed;
    }
    if (Array.isArray(value) && value.length > 0) {
        const parsed = Number(value[0]);
        return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
};

export const authSchemas = {
    registerBody: z.object({
        email: z.string().email(),
        password: z.string().min(6),
    }),
    loginBody: z.object({
        idToken: firebaseIdTokenSchema,
    }),
    refreshBody: z.object({
        idToken: firebaseIdTokenSchema,
    }),
    passwordResetRequestBody: z.object({
        email: z.string().email(),
    }),
    passwordResetBody: z.object({
        userId: z.string().min(1, 'User ID is required'),
        newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    }),
};

export const gameSchemas = {
    createBody: z.object({
        difficulty: difficultyEnum,
        firstClickRow: z.number().int().nonnegative(),
        firstClickCol: z.number().int().nonnegative(),
    }),
    revealBody: z.object({
        gameId: z.string().uuid(),
        row: z.number().int().nonnegative(),
        col: z.number().int().nonnegative(),
    }),
    toggleFlagBody: z.object({
        gameId: z.string().uuid(),
        row: z.number().int().nonnegative(),
        col: z.number().int().nonnegative(),
    }),
    historyQuery: z.object({
        limit: z
            .preprocess(coerceNumber, z.number().int().min(1).max(100))
            .optional(),
    }),
};

