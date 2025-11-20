import express from 'express';
import { LeaderboardController } from '../controllers/leaderboardController';

const router = express.Router();
const leaderboardController = new LeaderboardController();

router.get('/', leaderboardController.getLeaderboards);

export default router;
