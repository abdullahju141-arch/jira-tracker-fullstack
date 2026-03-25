// src/routes/index.ts
import { Router } from 'express';
import { body, query } from 'express-validator';
import { protect } from '../middleware/auth';

// Controllers
import * as auth     from '../controllers/authController';
import * as users    from '../controllers/usersController';
import * as projects from '../controllers/projectsController';
import * as issues   from '../controllers/issuesController';
import * as comments from '../controllers/commentsController';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH  /api/auth
// ═══════════════════════════════════════════════════════════════════════════════
const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  auth.register
);

authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  auth.login
);

authRouter.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  auth.refreshToken
);

authRouter.get('/me', protect, auth.getMe);

router.use('/auth', authRouter);

// ═══════════════════════════════════════════════════════════════════════════════
// USERS  /api/users
// ═══════════════════════════════════════════════════════════════════════════════
const usersRouter = Router();
usersRouter.use(protect);

usersRouter.get('/', users.getAllUsers);
usersRouter.get('/:id', users.getUserById);
usersRouter.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
  ],
  users.updateProfile
);

router.use('/users', usersRouter);

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTS  /api/projects
// ═══════════════════════════════════════════════════════════════════════════════
const projectsRouter = Router();
projectsRouter.use(protect);

projectsRouter.get('/', projects.getProjects);

projectsRouter.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
  ],
  projects.createProject
);

projectsRouter.get('/:id', projects.getProjectById);

projectsRouter.patch(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
  ],
  projects.updateProject
);

projectsRouter.delete('/:id', projects.deleteProject);

projectsRouter.post(
  '/:id/members',
  [body('userId').notEmpty().withMessage('userId is required')],
  projects.addMember
);

projectsRouter.delete(
  '/:id/members/:userId',
  projects.removeMember
);

// Issues scoped under a project
projectsRouter.get(
  '/:projectId/issues',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['backlog', 'in-progress', 'done']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  ],
  issues.getIssues
);

router.use('/projects', projectsRouter);

// ═══════════════════════════════════════════════════════════════════════════════
// ISSUES  /api/issues
// ═══════════════════════════════════════════════════════════════════════════════
const issuesRouter = Router();
issuesRouter.use(protect);

issuesRouter.post(
  '/',
  [
    body('projectId').notEmpty().withMessage('projectId is required'),
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('status').optional().isIn(['backlog', 'in-progress', 'done']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
    body('labels').optional().isArray().withMessage('Labels must be an array'),
    // frontend sends `null` when unassigned
    body('assigneeId').optional({ nullable: true }).isMongoId().withMessage('Invalid assigneeId'),
  ],
  issues.createIssue
);

issuesRouter.get('/:id', issues.getIssueById);

issuesRouter.patch(
  '/:id',
  [
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('status').optional().isIn(['backlog', 'in-progress', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('labels').optional().isArray(),
    body('assigneeId').optional({ nullable: true }).isMongoId().withMessage('Invalid assigneeId'),
  ],
  issues.updateIssue
);

issuesRouter.delete('/:id', issues.deleteIssue);

// Comments nested under issues
issuesRouter.get('/:issueId/comments', issues.getIssueById.length > 0 ? [] : [], comments.getComments);
issuesRouter.post(
  '/:issueId/comments',
  [body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1–2000 characters')],
  comments.addComment
);

router.use('/issues', issuesRouter);

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS  /api/comments
// ═══════════════════════════════════════════════════════════════════════════════
const commentsRouter = Router();
commentsRouter.use(protect);

commentsRouter.delete('/:id', comments.deleteComment);

router.use('/comments', commentsRouter);

export default router;
