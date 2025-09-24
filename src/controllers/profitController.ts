import { Request, Response } from 'express';
import { ProfitService } from '../services/profitService';
import { ProjectService } from '../services/ProjectService';

interface AuthRequest extends Request {
  user?: any;
}

export class ProfitController {
  private profitService: ProfitService;
  private projectService: ProjectService;

  constructor() {
    this.profitService = new ProfitService();
    this.projectService = new ProjectService();
  }

  // Check if project is ready for distribution
  checkDistributionReadiness = async (req: AuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;

      const readinessCheck = await this.projectService.isProjectReadyForDistribution(projectId);

      res.json({
        message: 'Distribution readiness checked',
        data: readinessCheck
      });

    } catch (error) {
      console.error('Error checking distribution readiness:', error);
      res.status(500).json({ 
        message: 'Error checking distribution readiness', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Admin endpoint untuk distribute profit
  distributeProfit = async (req: AuthRequest, res: Response) => {
    try {
      const { 
        projectId, 
        initialCapital, 
        totalRevenue, 
        newProfit 
      } = req.body;

      // Validasi input
      if (!projectId || !initialCapital || !totalRevenue || !newProfit) {
        return res.status(400).json({ 
          message: 'Missing required fields: projectId, initialCapital, totalRevenue, newProfit' 
        });
      }

      if (newProfit <= 0) {
        return res.status(400).json({ 
          message: 'New profit must be greater than 0' 
        });
      }

      // Check if project is ready for distribution
      const readinessCheck = await this.projectService.isProjectReadyForDistribution(projectId);
      if (!readinessCheck.ready) {
        return res.status(400).json({
          message: 'Project not ready for profit distribution',
          error: readinessCheck.reason,
          data: {
            tokensSold: readinessCheck.tokensSold,
            totalTokens: readinessCheck.totalTokens,
            availableTokens: readinessCheck.availableTokens
          }
        });
      }

      const result = await this.profitService.distributeProfit(
        projectId,
        initialCapital,
        totalRevenue,
        newProfit,
        req.user.id
      );

      res.json({
        message: 'Profit distributed successfully',
        data: result.distributionData
      });

    } catch (error) {
      console.error('Error distributing profit:', error);
      res.status(500).json({ 
        message: 'Error distributing profit', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get profit history for a project
  getProfitHistory = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const history = await this.profitService.getProfitHistory(projectId);
      
      res.json({
        message: 'Profit history retrieved successfully',
        data: history
      });

    } catch (error) {
      console.error('Error getting profit history:', error);
      res.status(500).json({ 
        message: 'Error getting profit history', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get user's profit history
  getUserProfitHistory = async (req: AuthRequest, res: Response) => {
    try {
      const { projectId } = req.query;
      const history = await this.profitService.getUserProfitHistory(
        req.user.id, 
        projectId as string
      );
      
      res.json({
        message: 'User profit history retrieved successfully',
        data: history
      });

    } catch (error) {
      console.error('Error getting user profit history:', error);
      res.status(500).json({ 
        message: 'Error getting user profit history', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}