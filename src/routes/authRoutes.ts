import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';
import { validateBody } from '../middleware/validation.js';
import { authSchemas } from '../validation/zodSchemas.js';

const router = express.Router();
const authController = new AuthController();

router.post('/register', validateBody(authSchemas.registerBody), authController.register);

router.post('/login', validateBody(authSchemas.loginBody), authController.login);

router.post('/logout', optionalAuth, authController.logout);

router.post('/password-reset-request', validateBody(authSchemas.passwordResetRequestBody), authController.passwordResetRequest);

router.post('/password-reset', validateBody(authSchemas.passwordResetBody), authController.passwordReset);

router.post('/refresh-token', validateBody(authSchemas.refreshBody), authController.refreshToken);

export default router;
