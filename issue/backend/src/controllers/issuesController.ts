// src/controllers/issuesController.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Issue } from '../models/Issue';
import { Comment } from '../models/Comment';
import { Project } from '../models/Project';
import { sendSuccess, sendError, formatIssue } from '../utils/response';
import { broadcast } from '../sockets/wsServer';
import type { Status, Priority } from '../types';

/**
 * GET /api/projects/:projectId/issues
 * Query params: search, labels, assignee, status, priority, page, limit
 */
export async function getIssues(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;

    // ── Build query ──────────────────────────────────────────────────────────
    const filter: Record<string, unknown> = {
      projectId: new mongoose.Types.ObjectId(projectId),
    };

    const { search, labels, assignee, status, priority } = req.query;

    if (search)   filter.title    = { $regex: search, $options: 'i' };
    if (status)   filter.status   = status as Status;
    if (priority) filter.priority = priority as Priority;
    if (assignee) filter.assigneeId = assignee === 'null'
      ? null
      : new mongoose.Types.ObjectId(assignee as string);

    if (labels) {
      const labelArr = Array.isArray(labels)
        ? labels as string[]
        : (labels as string).split(',');
      filter.labels = { $all: labelArr };
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const skip  = (page - 1) * limit;

    const [issues, total] = await Promise.all([
      Issue.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Issue.countDocuments(filter),
    ]);

    sendSuccess(res, {
      issues: issues.map(formatIssue),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/issues/:id
 */
export async function getIssueById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) { sendError(res, 'Issue not found', 404); return; }

    sendSuccess(res, { issue: formatIssue(issue) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/issues
 * Body: { projectId, title, description?, status?, labels?, assigneeId?, priority? }
 * Viewer role cannot create issues
 */
export async function createIssue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { sendError(res, 'Validation failed', 400, errors.array()); return; }

    const {
      projectId, title, description = '',
      status = 'backlog', labels = [], assigneeId = null, priority = 'medium',
    } = req.body;

    const issue = await Issue.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      title,
      description,
      status,
      labels,
      assigneeId: assigneeId ? new mongoose.Types.ObjectId(assigneeId) : null,
      priority,
      version: 1,
    });

    // Update project's updatedAt
    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });

    const formatted = formatIssue(issue);

    // Broadcast to WebSocket clients in this project's room
    broadcast(projectId, { type: 'issue.created', payload: formatted });

    sendSuccess(res, { issue: formatted }, 'Issue created', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/issues/:id
 * Body: any subset of { title, description, status, labels, assigneeId, priority }
 * Viewer role cannot update issues
 * Supports optimistic concurrency via the `version` header
 */
export async function updateIssue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) { sendError(res, 'Issue not found', 404); return; }

    // Optimistic concurrency check (optional — client sends X-Version header)
    const clientVersion = req.headers['x-version'];
    if (clientVersion && Number(clientVersion) !== issue.version) {
      sendError(
        res,
        `Version conflict: client has v${clientVersion}, server has v${issue.version}. Reload and retry.`,
        409
      );
      return;
    }

    // Apply changes
    const allowed = ['title','description','status','labels','assigneeId','priority'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'assigneeId') {
          (issue as any).assigneeId = req.body.assigneeId
            ? new mongoose.Types.ObjectId(req.body.assigneeId)
            : null;
        } else {
          (issue as any)[field] = req.body[field];
        }
      }
    });

    // version is auto-incremented in the pre-save hook on Issue model
    await issue.save();

    // Update project's updatedAt
    await Project.findByIdAndUpdate(issue.projectId, { updatedAt: new Date() });

    const formatted = formatIssue(issue);

    // Broadcast real-time update
    broadcast(issue.projectId.toString(), { type: 'issue.updated', payload: formatted });

    sendSuccess(res, { issue: formatted }, 'Issue updated');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/issues/:id
 * Admin or issue creator can delete
 */
export async function deleteIssue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) { sendError(res, 'Issue not found', 404); return; }

    // Members can only delete their own issues (if assignee); admins can delete any
    // We allow any member of the project to delete for simplicity (can be tightened)
    const projectId = issue.projectId.toString();
    const issueId   = issue._id.toString();

    await issue.deleteOne();

    // Cascade delete all comments for this issue
    await Comment.deleteMany({ issueId: issue._id });

    // Broadcast real-time delete
    broadcast(projectId, { type: 'issue.deleted', payload: { id: issueId } });

    sendSuccess(res, null, 'Issue deleted');
  } catch (err) {
    next(err);
  }
}
