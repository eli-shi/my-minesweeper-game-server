import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';

const router = express.Router();
const authController = new AuthController();

router.get('/me', verifyToken, authController.getProfile);

export default router;
