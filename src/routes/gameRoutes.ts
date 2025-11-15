import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { GameController } from '../controllers/gameController.js';

const router = express.Router();
const gameController = new GameController();

// Get available difficulties (no auth required)
router.get('/difficulties', gameController.getDifficulties);

// Create a new game (no auth required - game state managed by frontend)
router.post('/', gameController.createGame);

// Toggle flag (no auth required - game state managed by frontend)
router.post('/flag', gameController.toggleFlag);

// Reveal a cell (requires auth - saves completed games)
router.post('/reveal', verifyToken, gameController.revealCell);

// Get game history (requires auth)
router.get('/history', verifyToken, gameController.getGameHistory);

export default router;

