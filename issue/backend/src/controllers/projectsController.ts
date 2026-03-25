// src/controllers/projectsController.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Issue } from '../models/Issue';
import { sendSuccess, sendError, formatProject } from '../utils/response';

// ── Helpers ────────────────────────────────────────────────────────────────────
async function enrichProject(project: any) {
  const count = await Issue.countDocuments({ projectId: project._id });
  return formatProject(project, count);
}

/**
 * GET /api/projects
 * Returns all projects.
 */
export async function getProjects(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await Project.find({}).sort({ updatedAt: -1 });

    const enriched = await Promise.all(projects.map(enrichProject));
    sendSuccess(res, { projects: enriched });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id
 * Returns a single project.
 */
export async function getProjectById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) { sendError(res, 'Project not found', 404); return; }

    sendSuccess(res, { project: await enrichProject(project) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects
 * Create a new project.
 * Body: { name, description?, color? }
 */
export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { sendError(res, 'Validation failed', 400, errors.array()); return; }

    const { name, description = '', color = '#4f46e5' } = req.body;
    const ownerId = new mongoose.Types.ObjectId(req.user!.id);

    const project = await Project.create({
      name,
      description,
      color,
      ownerId,
      memberIds: [ownerId], // owner is always a member
    });

    sendSuccess(res, { project: await enrichProject(project) }, 'Project created', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:id
 * Update name / description / color.
 */
export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) { sendError(res, 'Project not found', 404); return; }

    const { name, description, color } = req.body;
    if (name)        project.name        = name;
    if (description !== undefined) project.description = description;
    if (color)       project.color       = color;

    await project.save();
    sendSuccess(res, { project: await enrichProject(project) }, 'Project updated');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:id
 * Delete project + all its issues + comments.
 */
export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) { sendError(res, 'Project not found', 404); return; }

    // Cascade delete all issues in this project
    await Issue.deleteMany({ projectId: project._id });
    await project.deleteOne();

    sendSuccess(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/members
 * Add a member to a project.
 * Body: { userId }
 */
export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) { sendError(res, 'Project not found', 404); return; }

    const { userId } = req.body;
    const memberId = new mongoose.Types.ObjectId(userId);

    if (project.memberIds.some(id => id.equals(memberId))) {
      sendError(res, 'User is already a member', 409);
      return;
    }

    project.memberIds.push(memberId);
    await project.save();

    sendSuccess(res, { project: await enrichProject(project) }, 'Member added');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:id/members/:userId
 * Remove a member from a project.
 */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) { sendError(res, 'Project not found', 404); return; }

    if (project.ownerId.toString() === req.params.userId) {
      sendError(res, 'Cannot remove the project owner', 400);
      return;
    }

    project.memberIds = project.memberIds.filter(
      id => id.toString() !== req.params.userId
    );
    await project.save();

    sendSuccess(res, { project: await enrichProject(project) }, 'Member removed');
  } catch (err) {
    next(err);
  }
}
