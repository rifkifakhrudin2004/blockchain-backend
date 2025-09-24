import { Request, Response } from 'express';
import { pool } from '../config/database';
import { Logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: any;
}

export class TransactionController {
  // Get all transactions (public - limited info)
  getAllTransactions = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = (page - 1) * limit;

      const [transactions] = await pool.execute(
        `SELECT 
          t.transaction_id,
          t.project_id,
          t.token_amount,
          t.total_value,
          t.transaction_type,
          t.status,
          t.created_at,
          p.name as project_name,
          fu.username as from_username,
          tu.username as to_username
         FROM transactions t
         JOIN projects p ON t.project_id = p.project_id
         LEFT JOIN users fu ON t.from_user_id = fu.id
         LEFT JOIN users tu ON t.to_user_id = tu.id
         WHERE t.status = 'completed'
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      // Get total count
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM transactions WHERE status = "completed"'
      ) as any;

      const totalTransactions = countResult[0].total;
      const totalPages = Math.ceil(totalTransactions / limit);

      res.json({
        message: 'Transactions retrieved successfully',
        data: transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalTransactions,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });

    } catch (error) {
      Logger.error('Error getting transactions', { error });
      res.status(500).json({ message: 'Error getting transactions' });
    }
  };

  // Get user's transactions
  getMyTransactions = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = (page - 1) * limit;

      const [transactions] = await pool.execute(
        `SELECT 
          t.*,
          p.name as project_name,
          fu.username as from_username,
          tu.username as to_username
         FROM transactions t
         JOIN projects p ON t.project_id = p.project_id
         LEFT JOIN users fu ON t.from_user_id = fu.id
         LEFT JOIN users tu ON t.to_user_id = tu.id
         WHERE t.from_user_id = ? OR t.to_user_id = ?
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [req.user.id, req.user.id, limit, offset]
      );

      // Get total count
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM transactions WHERE from_user_id = ? OR to_user_id = ?',
        [req.user.id, req.user.id]
      ) as any;

      const totalTransactions = countResult[0].total;
      const totalPages = Math.ceil(totalTransactions / limit);

      res.json({
        message: 'Your transactions retrieved successfully',
        data: transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalTransactions,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });

    } catch (error) {
      Logger.error('Error getting user transactions', { error });
      res.status(500).json({ message: 'Error getting user transactions' });
    }
  };

  // Get transactions by project
  getTransactionsByProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = (page - 1) * limit;

      const [transactions] = await pool.execute(
        `SELECT 
          t.transaction_id,
          t.token_amount,
          t.total_value,
          t.transaction_type,
          t.status,
          t.created_at,
          fu.username as from_username,
          tu.username as to_username
         FROM transactions t
         LEFT JOIN users fu ON t.from_user_id = fu.id
         LEFT JOIN users tu ON t.to_user_id = tu.id
         WHERE t.project_id = ?
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [projectId, limit, offset]
      );

      // Get project info
      const [projects] = await pool.execute(
        'SELECT project_id, name FROM projects WHERE project_id = ?',
        [projectId]
      ) as any;

      if (projects.length === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Get total count
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM transactions WHERE project_id = ?',
        [projectId]
      ) as any;

      const totalTransactions = countResult[0].total;
      const totalPages = Math.ceil(totalTransactions / limit);

      res.json({
        message: 'Project transactions retrieved successfully',
        project: projects[0],
        data: transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalTransactions,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });

    } catch (error) {
      Logger.error('Error getting project transactions', { error });
      res.status(500).json({ message: 'Error getting project transactions' });
    }
  };

  // Admin: Get all transactions with full details
  getAllTransactionsAdmin = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let whereClause = '';
      let params: any[] = [];

      if (status) {
        whereClause = 'WHERE t.status = ?';
        params.push(status);
      }

      const [transactions] = await pool.execute(
        `SELECT 
          t.*,
          p.name as project_name,
          fu.username as from_username, fu.email as from_email,
          tu.username as to_username, tu.email as to_email
         FROM transactions t
         JOIN projects p ON t.project_id = p.project_id
         LEFT JOIN users fu ON t.from_user_id = fu.id
         LEFT JOIN users tu ON t.to_user_id = tu.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
      const [countResult] = await pool.execute(countQuery, params) as any;

      const totalTransactions = countResult[0].total;
      const totalPages = Math.ceil(totalTransactions / limit);

      res.json({
        message: 'All transactions retrieved successfully',
        data: transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalTransactions,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });

    } catch (error) {
      Logger.error('Error getting all transactions for admin', { error });
      res.status(500).json({ message: 'Error getting all transactions' });
    }
  };

  // Admin: Approve transaction
  approveTransaction = async (req: AuthRequest, res: Response) => {
    try {
      const { transactionId } = req.params;

      // Check if transaction exists and is pending
      const [transactions] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_id = ? AND status = "pending"',
        [transactionId]
      ) as any;

      if (transactions.length === 0) {
        return res.status(404).json({ 
          message: 'Transaction not found or not in pending status' 
        });
      }

      // Update transaction status
      await pool.execute(
        'UPDATE transactions SET status = "approved", approved_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
        [transactionId]
      );

      Logger.info('Transaction approved', {
        transactionId,
        approvedBy: req.user.id,
        adminUsername: req.user.username
      });

      res.json({
        message: 'Transaction approved successfully',
        transactionId
      });

    } catch (error) {
      Logger.error('Error approving transaction', { error, transactionId: req.params.transactionId });
      res.status(500).json({ message: 'Error approving transaction' });
    }
  };

  // Admin: Reject transaction
  rejectTransaction = async (req: AuthRequest, res: Response) => {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      // Check if transaction exists and is pending
      const [transactions] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_id = ? AND status = "pending"',
        [transactionId]
      ) as any;

      if (transactions.length === 0) {
        return res.status(404).json({ 
          message: 'Transaction not found or not in pending status' 
        });
      }

      // Update transaction status
      await pool.execute(
        'UPDATE transactions SET status = "rejected", approved_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
        [transactionId]
      );

      Logger.info('Transaction rejected', {
        transactionId,
        rejectedBy: req.user.id,
        adminUsername: req.user.username,
        reason
      });

      res.json({
        message: 'Transaction rejected successfully',
        transactionId,
        reason
      });

    } catch (error) {
      Logger.error('Error rejecting transaction', { error, transactionId: req.params.transactionId });
      res.status(500).json({ message: 'Error rejecting transaction' });
    }
  };
}