import { z } from 'zod';

const idTokenSchema = z.string().min(100, 'Firebase ID token must be a JWT string');

export const authSchemas = {
    register: z.object({
        email: z.string().email(),
        password: z.string().min(6),
    }),
    login: z.object({
        idToken: idTokenSchema,
    }),
    refresh: z.object({
        idToken: idTokenSchema,
    }),
};


export const gameSchemas = {
    create: z.object({
        difficulty: z.enum(['easy', 'medium', 'hard']),
        firstClickRow: z.number().int().nonnegative(),
        firstClickCol: z.number().int().nonnegative(),
    }),
    reveal: z.object({
        difficulty: z.enum(['easy', 'medium', 'hard']),
        board: z.array(z.any()),
        revealed: z.array(z.array(z.boolean())),
        flagged: z.array(z.array(z.boolean())),
        row: z.number().int().nonnegative(),
        col: z.number().int().nonnegative(),
    }),
    toggleFlag: z.object({
        difficulty: z.enum(['easy', 'medium', 'hard']),
        revealed: z.array(z.array(z.boolean())),
        flagged: z.array(z.array(z.boolean())),
        row: z.number().int().nonnegative(),
        col: z.number().int().nonnegative(),
    }),
};
