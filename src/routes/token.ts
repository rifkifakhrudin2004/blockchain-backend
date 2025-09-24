import { Router } from 'express';
import { TokenController } from '../controllers/tokenController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const tokenController = new TokenController();

// User routes
router.post('/purchase', authenticateToken, tokenController.purchaseTokens);
router.get('/my-tokens', authenticateToken, tokenController.getMyTokens);

// Public routes
router.get('/project/:projectId', tokenController.getTokensByProject);

export default router;