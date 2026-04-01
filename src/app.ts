import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { corsOptions } from './config/cors.js';
import {
    generalLimiter,
    authLimiter,
    gameActionLimiter,
    leaderboardLimiter
} from './middleware/rateLimiter.js';

dotenv.config();

const app = express();

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

app.use('/auth', authLimiter, authRoutes);
app.use('/games', gameActionLimiter, gameRoutes);
app.use('/games/leaderboard', leaderboardLimiter, leaderboardRoutes);
app.use('/admin', generalLimiter, adminRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
