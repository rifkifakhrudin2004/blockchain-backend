import { Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';

interface AuthRequest extends Request {
  user?: any;
}
// Controller for project-related endpoints
export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  // Admin creates new project
  createProject = async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, total_tokens, token_price, initial_capital } = req.body;

      if (!name || !total_tokens || !token_price || !initial_capital) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const project = await this.projectService.createProject(
        name,
        description,
        total_tokens,
        token_price,
        initial_capital,
        req.user.id
      );

      res.status(201).json({
        message: 'Project created successfully',
        project
      });

    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ 
        message: 'Error creating project',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get all active projects (for public/user view)
  getAllActiveProjects = async (req: Request, res: Response) => {
    try {
      const projects = await this.projectService.getAllActiveProjects();

      res.json({
        message: 'Active projects retrieved successfully',
        data: projects
      });

    } catch (error) {
      console.error('Error getting active projects:', error);
      res.status(500).json({ 
        message: 'Error getting active projects',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get all projects (including completed - for admin overview if needed)
  getAllProjects = async (req: Request, res: Response) => {
    try {
      const projects = await this.projectService.getAllProjects();

      res.json({
        message: 'Projects retrieved successfully',
        data: projects
      });

    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({ 
        message: 'Error getting projects',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get project by ID
  getProjectById = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const project = await this.projectService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json({
        message: 'Project retrieved successfully',
        data: project
      });

    } catch (error) {
      console.error('Error getting project:', error);
      res.status(500).json({ 
        message: 'Error getting project',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get project with detailed info including token holders
  getProjectWithTokenHolders = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const project = await this.projectService.getProjectWithTokenHolders(projectId);

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json({
        message: 'Project with token holders info retrieved successfully',
        data: project
      });

    } catch (error) {
      console.error('Error getting project with token holders:', error);
      res.status(500).json({ 
        message: 'Error getting project with token holders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get admin's active projects only (for profit distribution dropdown)
  getMyActiveProjects = async (req: AuthRequest, res: Response) => {
    try {
      const projects = await this.projectService.getMyActiveProjects(req.user.id);

      res.json({
        message: 'Your active projects retrieved successfully',
        data: projects
      });

    } catch (error) {
      console.error('Error getting admin active projects:', error);
      res.status(500).json({ 
        message: 'Error getting admin active projects',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get admin's all projects (active and completed - for project management)
  getMyProjects = async (req: AuthRequest, res: Response) => {
    try {
      const projects = await this.projectService.getMyAllProjects(req.user.id);

      res.json({
        message: 'Your projects retrieved successfully',
        data: projects
      });

    } catch (error) {
      console.error('Error getting admin projects:', error);
      res.status(500).json({ 
        message: 'Error getting admin projects',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get project statistics
  getProjectStats = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const stats = await this.projectService.getProjectStats(projectId);

      if (!stats) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json({
        message: 'Project statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error getting project statistics:', error);
      res.status(500).json({ 
        message: 'Error getting project statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Update project status (if needed for manual override)
  updateProjectStatus = async (req: AuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const { status } = req.body;

      if (!['active', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status. Must be: active, completed, or cancelled' 
        });
      }

      // Check if admin owns this project
      const isOwner = await this.projectService.isProjectOwnedByAdmin(projectId, req.user.id);
      if (!isOwner) {
        return res.status(403).json({ message: 'You can only update your own projects' });
      }

      const updated = await this.projectService.updateProjectStatus(projectId, status);

      if (!updated) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json({
        message: 'Project status updated successfully',
        data: { projectId, status }
      });

    } catch (error) {
      console.error('Error updating project status:', error);
      res.status(500).json({ 
        message: 'Error updating project status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}