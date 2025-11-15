import express from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth.js';
import { GameController } from '../controllers/gameController.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { gameSchemas } from '../validation/zodSchemas.js';

const router = express.Router();
const gameController = new GameController();

// Get available difficulties (no auth required)
router.get('/difficulties', gameController.getDifficulties);

// Create a new game (no auth required - game state managed by frontend)
router.post('/', validateBody(gameSchemas.createBody), gameController.createGame);

// Toggle flag (no auth required - game state managed by frontend)
router.post('/flag', validateBody(gameSchemas.toggleFlagBody), gameController.toggleFlag);

// Reveal a cell (supports guests; stats saved only when authenticated)
router.post('/reveal', optionalAuth, validateBody(gameSchemas.revealBody), gameController.revealCell);

// Get game history (requires auth)
router.get('/history', verifyToken, validateQuery(gameSchemas.historyQuery), gameController.getGameHistory);

export default router;

