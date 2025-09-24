import { Request, Response } from 'express';
import { pool } from '../config/database';
import { BlockchainService } from '../config/blockchain';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  user?: any;
}

export class TokenController {
  private blockchainService: BlockchainService;

  constructor() {
    this.blockchainService = new BlockchainService();
  }

  // User purchases tokens
  purchaseTokens = async (req: AuthRequest, res: Response) => {
    const connection = await pool.getConnection();
    
    try {
      const { project_id, amount } = req.body;

      if (!project_id || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid project_id or amount' });
      }

      await connection.beginTransaction();

      // Check project availability
      const [projects] = await connection.execute(
        'SELECT * FROM projects WHERE project_id = ? AND status = "active"',
        [project_id]
      ) as any;

      if (projects.length === 0) {
        return res.status(404).json({ message: 'Project not found or not active' });
      }

      const project = projects[0];

      if (project.available_tokens < amount) {
        return res.status(400).json({ 
          message: `Insufficient tokens available. Only ${project.available_tokens} tokens left.` 
        });
      }

      // Create token record
      const token_id = `TOKEN_${Date.now()}_${uuidv4().slice(0, 8)}`;
      const total_value = amount * project.token_price;

      // Record on blockchain
      const blockchainResult = await this.blockchainService.createToken(
        token_id,
        project_id,
        amount
      );

      // Insert token record
      await connection.execute(
        `INSERT INTO tokens 
         (token_id, project_id, user_id, amount, price_per_token, total_value, status, blockchain_hash) 
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
        [token_id, project_id, req.user.id, amount, project.token_price, total_value, blockchainResult.hash]
      );

      // Update project available tokens
      await connection.execute(
        'UPDATE projects SET available_tokens = available_tokens - ? WHERE project_id = ?',
        [amount, project_id]
      );

      // Record transaction
      const transaction_id = `TXN_${Date.now()}_${uuidv4().slice(0, 8)}`;
      await connection.execute(
        `INSERT INTO transactions 
         (transaction_id, from_user_id, to_user_id, project_id, token_amount, total_value, transaction_type, status, blockchain_hash) 
         VALUES (?, ?, ?, ?, ?, ?, 'purchase', 'completed', ?)`,
        [transaction_id, project.admin_id, req.user.id, project_id, amount, total_value, blockchainResult.hash]
      );

      await connection.commit();

      res.status(201).json({
        message: 'Tokens purchased successfully',
        token: {
          token_id,
          project_id,
          amount,
          total_value,
          blockchain_hash: blockchainResult.hash
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error purchasing tokens:', error);
      res.status(500).json({ message: 'Error purchasing tokens' });
    } finally {
      connection.release();
    }
  };

  // Get user's tokens
  getMyTokens = async (req: AuthRequest, res: Response) => {
    try {
      const [tokens] = await pool.execute(
        `SELECT t.*, p.name as project_name, p.description as project_description
         FROM tokens t
         JOIN projects p ON t.project_id = p.project_id
         WHERE t.user_id = ? AND t.status = 'active'
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );

      res.json({
        message: 'Your tokens retrieved successfully',
        data: tokens
      });

    } catch (error) {
      console.error('Error getting user tokens:', error);
      res.status(500).json({ message: 'Error getting user tokens' });
    }
  };

  // Get tokens by project
  getTokensByProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const [tokens] = await pool.execute(
        `SELECT t.*, u.username, u.email
         FROM tokens t
         JOIN users u ON t.user_id = u.id
         WHERE t.project_id = ? AND t.status = 'active'
         ORDER BY t.created_at DESC`,
        [projectId]
      );

      res.json({
        message: 'Project tokens retrieved successfully',
        data: tokens
      });

    } catch (error) {
      console.error('Error getting project tokens:', error);
      res.status(500).json({ message: 'Error getting project tokens' });
    }
  };
}