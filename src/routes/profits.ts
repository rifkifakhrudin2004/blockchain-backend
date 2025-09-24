import { Router } from 'express';
import { ProfitController } from '../controllers/profitController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const profitController = new ProfitController();

// Admin routes
router.post('/distribute', 
  authenticateToken, 
  requireRole('admin'), 
  profitController.distributeProfit
);

// Check if project is ready for distribution
router.get('/check-readiness/:projectId', 
  authenticateToken, 
  requireRole('admin'), 
  profitController.checkDistributionReadiness
);

router.get('/history/:projectId', 
  authenticateToken, 
  profitController.getProfitHistory
);

// User routes
router.get('/my-profits', 
  authenticateToken, 
  profitController.getUserProfitHistory
);

export default router;