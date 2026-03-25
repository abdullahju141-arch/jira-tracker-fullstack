// src/controllers/commentsController.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Comment } from '../models/Comment';
import { Issue } from '../models/Issue';
import { sendSuccess, sendError, formatComment } from '../utils/response';
import { broadcast } from '../sockets/wsServer';

/**
 * GET /api/issues/:issueId/comments
 * Returns all comments for an issue (oldest first for thread order)
 */
export async function getComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId);
    if (!issue) { sendError(res, 'Issue not found', 404); return; }

    const comments = await Comment.find({ issueId: new mongoose.Types.ObjectId(issueId) })
      .sort({ createdAt: 1 });

    sendSuccess(res, { comments: comments.map(formatComment) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/issues/:issueId/comments
 * Body: { message }
 * Viewer role cannot post comments
 */
export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const { issueId } = req.params;
    const { message } = req.body;

    const issue = await Issue.findById(issueId);
    if (!issue) { sendError(res, 'Issue not found', 404); return; }

    const comment = await Comment.create({
      issueId:  new mongoose.Types.ObjectId(issueId),
      userId:   new mongoose.Types.ObjectId(req.user!.id),
      message,
    });

    const formatted = formatComment(comment);

    // Broadcast to WebSocket clients in this project's room
    broadcast(issue.projectId.toString(), {
      type:    'comment.added',
      payload: formatted,
    });

    sendSuccess(res, { comment: formatted }, 'Comment added', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/comments/:id
 * Any authenticated user can delete.
 */
export async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) { sendError(res, 'Comment not found', 404); return; }
    // Simplified permissions: any authenticated user can delete comments.
    await comment.deleteOne();
    sendSuccess(res, null, 'Comment deleted');
  } catch (err) {
    next(err);
  }
}
