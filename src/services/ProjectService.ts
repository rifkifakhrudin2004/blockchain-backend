import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class ProjectService {
  // Create new project
  async createProject(
    name: string,
    description: string,
    total_tokens: number,
    token_price: number,
    initial_capital: number,
    adminId: number
  ) {
    const project_id = `PROJECT_${Date.now()}_${uuidv4().slice(0, 8)}`;

    const [result] = await pool.execute(
      `INSERT INTO projects 
       (project_id, name, description, total_tokens, available_tokens, token_price, initial_capital, admin_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [project_id, name, description, total_tokens, total_tokens, token_price, initial_capital, adminId]
    ) as any;

    return {
      id: result.insertId,
      project_id,
      name,
      description,
      total_tokens,
      available_tokens: total_tokens,
      token_price,
      initial_capital,
      status: 'active'
    };
  }

  // Get all active projects (for public view)
  async getAllActiveProjects() {
    const [projects] = await pool.execute(
      `SELECT p.*, u.username as admin_name 
       FROM projects p 
       JOIN users u ON p.admin_id = u.id 
       WHERE p.status = 'active'
       ORDER BY p.created_at DESC`
    );

    return projects;
  }

  // Get all projects (including completed - for admin overview if needed)
  async getAllProjects() {
    const [projects] = await pool.execute(
      `SELECT p.*, u.username as admin_name 
       FROM projects p 
       JOIN users u ON p.admin_id = u.id 
       ORDER BY p.created_at DESC`
    );

    return projects;
  }

  // Get project by ID (regardless of status)
  async getProjectById(projectId: string) {
    const [projects] = await pool.execute(
      `SELECT p.*, u.username as admin_name, u.email as admin_email
       FROM projects p 
       JOIN users u ON p.admin_id = u.id 
       WHERE p.project_id = ?`,
      [projectId]
    ) as any;

    return projects.length > 0 ? projects[0] : null;
  }

  // Get admin's active projects only (for profit distribution)
  async getMyActiveProjects(adminId: number) {
    const [projects] = await pool.execute(
      `SELECT * FROM projects 
       WHERE admin_id = ? AND status = 'active' 
       ORDER BY created_at DESC`,
      [adminId]
    );

    return projects;
  }

  // Get admin's all projects (active and completed)
  async getMyAllProjects(adminId: number) {
    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE admin_id = ? ORDER BY created_at DESC',
      [adminId]
    );

    return projects;
  }

  // Update project status
  async updateProjectStatus(projectId: string, status: 'active' | 'completed' | 'cancelled') {
    const [result] = await pool.execute(
      'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?',
      [status, projectId]
    ) as any;

    return result.affectedRows > 0;
  }

  // Get project statistics
  async getProjectStats(projectId: string) {
    const [stats] = await pool.execute(
      `SELECT 
        p.*,
        (SELECT COUNT(*) FROM tokens t WHERE t.project_id = p.project_id AND t.status = 'active') as token_holders_count,
        (SELECT COALESCE(SUM(t.amount), 0) FROM tokens t WHERE t.project_id = p.project_id AND t.status = 'active') as tokens_sold,
        (SELECT COUNT(*) FROM profit_distributions pd WHERE pd.project_id = p.project_id) as profit_distributions_count
       FROM projects p 
       WHERE p.project_id = ?`,
      [projectId]
    ) as any;

    return stats.length > 0 ? stats[0] : null;
  }

  // Check if project exists and is owned by admin
  async isProjectOwnedByAdmin(projectId: string, adminId: number): Promise<boolean> {
    const [result] = await pool.execute(
      'SELECT id FROM projects WHERE project_id = ? AND admin_id = ?',
      [projectId, adminId]
    ) as any;

    return result.length > 0;
  }

  // Get project with token holders info
  async getProjectWithTokenHolders(projectId: string) {
    const [result] = await pool.execute(
      `SELECT p.*, u.username as admin_name,
              (SELECT COUNT(DISTINCT user_id) FROM tokens t WHERE t.project_id = p.project_id AND t.status = 'active') as unique_token_holders,
              (SELECT COALESCE(SUM(amount), 0) FROM tokens t WHERE t.project_id = p.project_id AND t.status = 'active') as total_tokens_sold
       FROM projects p
       JOIN users u ON p.admin_id = u.id
       WHERE p.project_id = ?`,
      [projectId]
    ) as any;

    return result.length > 0 ? result[0] : null;
  }

  // Check if project is ready for profit distribution
  async isProjectReadyForDistribution(projectId: string) {
    try {
      const [projectResult] = await pool.execute(
        'SELECT project_id, status, total_tokens, available_tokens FROM projects WHERE project_id = ?',
        [projectId]
      ) as any;

      if (projectResult.length === 0) {
        return {
          ready: false,
          reason: 'Project not found',
          projectExists: false,
          tokensSold: 0,
          totalTokens: 0,
          availableTokens: 0
        };
      }

      const project = projectResult[0];

      // Check if project is already completed
      if (project.status === 'completed') {
        return {
          ready: false,
          reason: 'Project is already completed',
          projectExists: true,
          tokensSold: project.total_tokens - project.available_tokens,
          totalTokens: project.total_tokens,
          availableTokens: project.available_tokens
        };
      }

      // Check if project is cancelled
      if (project.status === 'cancelled') {
        return {
          ready: false,
          reason: 'Project is cancelled',
          projectExists: true,
          tokensSold: project.total_tokens - project.available_tokens,
          totalTokens: project.total_tokens,
          availableTokens: project.available_tokens
        };
      }

      // Check if all tokens are sold
      if (project.available_tokens > 0) {
        const tokensSold = project.total_tokens - project.available_tokens;
        return {
          ready: false,
          reason: `Cannot distribute profit until all tokens are sold. Currently ${tokensSold}/${project.total_tokens} tokens sold. Remaining: ${project.available_tokens} tokens.`,
          projectExists: true,
          tokensSold,
          totalTokens: project.total_tokens,
          availableTokens: project.available_tokens
        };
      }

      // Check if there are any token holders
      const [tokenHolders] = await pool.execute(
        'SELECT COUNT(DISTINCT user_id) as holder_count FROM tokens WHERE project_id = ? AND status = "active"',
        [projectId]
      ) as any;

      if (tokenHolders[0].holder_count === 0) {
        return {
          ready: false,
          reason: 'No active token holders found for this project',
          projectExists: true,
          tokensSold: project.total_tokens - project.available_tokens,
          totalTokens: project.total_tokens,
          availableTokens: project.available_tokens
        };
      }

      // All checks passed - project is ready for distribution
      return {
        ready: true,
        reason: 'Project is ready for profit distribution',
        projectExists: true,
        tokensSold: project.total_tokens - project.available_tokens,
        totalTokens: project.total_tokens,
        availableTokens: project.available_tokens,
        tokenHolderCount: tokenHolders[0].holder_count
      };

    } catch (error) {
      console.error('Error checking distribution readiness:', error);
      return {
        ready: false,
        reason: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        projectExists: false,
        tokensSold: 0,
        totalTokens: 0,
        availableTokens: 0
      };
    }
  }
}