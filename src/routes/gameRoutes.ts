import express from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth.js';
import { GameController } from '../controllers/gameController.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { gameSchemas } from '../validation/zodSchemas.js';

const router = express.Router();
const gameController = new GameController();

router.get('/difficulties', gameController.getDifficulties);

router.post('/', optionalAuth, validateBody(gameSchemas.createBody), gameController.createGame);

router.post('/flag', validateBody(gameSchemas.toggleFlagBody), gameController.toggleFlag);

router.post('/reveal', optionalAuth, validateBody(gameSchemas.revealBody), gameController.revealCell);

router.get('/history', verifyToken, gameController.getGameHistory);

export default router;

