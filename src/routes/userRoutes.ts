import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';

const router = express.Router();
const authController = new AuthController();

// Get current user profile route
router.get('/me', verifyToken, authController.getProfile);

export default router;
