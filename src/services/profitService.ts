import { pool } from '../config/database';
import { BlockchainService } from '../config/blockchain';
import { v4 as uuidv4 } from 'uuid';

export class ProfitService {
  private blockchainService: BlockchainService;

  constructor() {
    this.blockchainService = new BlockchainService();
  }

  async distributeProfit(
    projectId: string, 
    initialCapital: number,
    totalRevenue: number,
    newProfit: number,
    adminId: number
  ) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if project exists and is active
      const [projectCheck] = await connection.execute(
        'SELECT status, available_tokens, total_tokens FROM projects WHERE project_id = ?',
        [projectId]
      ) as any;

      if (projectCheck.length === 0) {
        throw new Error('Project not found');
      }

      if (projectCheck[0].status === 'completed') {
        throw new Error('Cannot distribute profit for completed project');
      }

      // Check if all tokens are sold
      if (projectCheck[0].available_tokens > 0) {
        const tokensSold = projectCheck[0].total_tokens - projectCheck[0].available_tokens;
        throw new Error(
          `Cannot distribute profit until all tokens are sold. Current: ${tokensSold}/${projectCheck[0].total_tokens} tokens sold. Remaining: ${projectCheck[0].available_tokens} tokens.`
        );
      }

      // Hitung pembagian berdasarkan keuntungan baru
      const adminShare = newProfit * 0.30; // 30% untuk admin
      const userTotalShare = newProfit * 0.70; // 70% untuk user

      // Get semua token holders untuk project ini
      const [tokenHolders] = await connection.execute(
        'SELECT user_id, SUM(amount) as total_tokens FROM tokens WHERE project_id = ? AND status = "active" GROUP BY user_id',
        [projectId]
      ) as any;

      if (tokenHolders.length === 0) {
        throw new Error('No token holders found for this project');
      }

      // Hitung total tokens yang dipegang user
      const totalUserTokens = tokenHolders.reduce((sum: number, holder: any) => 
        sum + holder.total_tokens, 0
      );

      const profitPerToken = userTotalShare / totalUserTokens;

      // Create profit distribution record
      const distributionId = uuidv4();
      await connection.execute(
        `INSERT INTO profit_distributions 
         (project_id, total_profit, admin_share, user_share, profit_per_token, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [projectId, newProfit, adminShare, userTotalShare, profitPerToken]
      );

      // Record di blockchain
      const blockchainResult = await this.blockchainService.addDividenProfit(
        projectId,
        newProfit,
        adminShare,
        userTotalShare,
        profitPerToken
      );

      // Update blockchain hash
      await connection.execute(
        'UPDATE profit_distributions SET blockchain_hash = ?, status = "completed" WHERE project_id = ? ORDER BY id DESC LIMIT 1',
        [blockchainResult.hash, projectId]
      );

      // Distribute profit to each user
      const userProfits = [];
      for (const holder of tokenHolders) {
        const userProfit = holder.total_tokens * profitPerToken;
        
        await connection.execute(
          `INSERT INTO user_profit_records 
           (user_id, project_id, token_amount, profit_amount, distribution_id) 
           VALUES (?, ?, ?, ?, (SELECT id FROM profit_distributions WHERE project_id = ? ORDER BY id DESC LIMIT 1))`,
          [holder.user_id, projectId, holder.total_tokens, userProfit, projectId]
        );

        userProfits.push({
          user_id: holder.user_id,
          token_amount: holder.total_tokens,
          profit_amount: userProfit
        });
      }

      // Update project status to 'completed' after successful profit distribution
      await connection.execute(
        'UPDATE projects SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE project_id = ?',
        [projectId]
      );

      await connection.commit();

      return {
        success: true,
        distributionData: {
          projectId,
          initialCapital,
          totalRevenue,
          newProfit,
          adminShare,
          userTotalShare,
          profitPerToken,
          totalUserTokens,
          userProfits,
          blockchainHash: blockchainResult.hash,
          projectStatus: 'completed'
        }
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getProfitHistory(projectId: string) {
    const [distributions] = await pool.execute(
      'SELECT * FROM profit_distributions WHERE project_id = ? ORDER BY distribution_date DESC',
      [projectId]
    );

    return distributions;
  }

  async getUserProfitHistory(userId: number, projectId?: string) {
    let query = `
      SELECT upr.*, pd.distribution_date, p.name as project_name 
      FROM user_profit_records upr
      JOIN profit_distributions pd ON upr.distribution_id = pd.id
      JOIN projects p ON upr.project_id = p.project_id
      WHERE upr.user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (projectId) {
      query += ' AND upr.project_id = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY upr.created_at DESC';

    const [records] = await pool.execute(query, params);
    return records;
  }
}