import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { AdminController } from '../controllers/adminController.js';

const router = express.Router();
const adminController = new AdminController();

router.get('/games', verifyToken, requireAdmin, adminController.getAllGames);
router.get('/games/user/:userId', verifyToken, requireAdmin, adminController.getGamesByUser);
router.get('/stats', verifyToken, requireAdmin, adminController.getGameStats);
router.get('/users', verifyToken, requireAdmin, adminController.getAllUsers);
router.patch('/users/:userId/role', verifyToken, requireAdmin, adminController.updateUserRole);

export default router;
