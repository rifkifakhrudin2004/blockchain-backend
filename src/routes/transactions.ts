// src/routes/transactions.ts
import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const transactionController = new TransactionController();

// Public routes
router.get('/', transactionController.getAllTransactions);
router.get('/project/:projectId', transactionController.getTransactionsByProject);

// User routes
router.get('/my', authenticateToken, transactionController.getMyTransactions);

// Admin routes
router.get('/admin/all', authenticateToken, requireRole('admin'), transactionController.getAllTransactionsAdmin);
router.put('/:transactionId/approve', authenticateToken, requireRole('admin'), transactionController.approveTransaction);
router.put('/:transactionId/reject', authenticateToken, requireRole('admin'), transactionController.rejectTransaction);

export default router;