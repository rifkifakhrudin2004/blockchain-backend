import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const projectController = new ProjectController();

// Public routes
router.get('/', projectController.getAllProjects); // Public can see all active projects
router.get('/active', projectController.getAllActiveProjects); // Only active projects for public
router.get('/:projectId', projectController.getProjectById);
router.get('/:projectId/stats', projectController.getProjectStats);
router.get('/:projectId/details', projectController.getProjectWithTokenHolders);

// Admin routes
router.post('/create', 
  authenticateToken, 
  requireRole('admin'), 
  projectController.createProject
);

router.get('/admin/my-projects', 
  authenticateToken, 
  requireRole('admin'), 
  projectController.getMyProjects
);

// New route for getting only active projects (for profit distribution dropdown)
router.get('/admin/my-active-projects', 
  authenticateToken, 
  requireRole('admin'), 
  projectController.getMyActiveProjects
);

// Update project status
router.put('/admin/:projectId/status', 
  authenticateToken, 
  requireRole('admin'), 
  projectController.updateProjectStatus
);

// Super admin route (if needed)
router.get('/admin/all', 
  authenticateToken, 
  requireRole('admin'), 
  projectController.getAllProjects
);

export default router;