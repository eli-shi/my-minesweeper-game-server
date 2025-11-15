import express from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';

const router = express.Router();
const authController = new AuthController();

// Registration route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

// Logout route - optional auth (works even if token is invalid/expired)
router.post('/logout', optionalAuth, authController.logout);

// Password reset request route
router.post('/password-reset-request', authController.passwordResetRequest);

// Password reset route
router.post('/password-reset', authController.passwordReset);


// Refresh token route
router.post('/refresh-token', authController.refreshToken);

export default router;
