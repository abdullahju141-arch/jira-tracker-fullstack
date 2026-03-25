// src/utils/response.ts
import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): void {
  res.status(statusCode).json({ success: true, message, data });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown
): void {
  res.status(statusCode).json({ success: false, message, ...(errors ? { errors } : {}) });
}

// Formats an Issue document → frontend shape
export function formatIssue(issue: any): object {
  return {
    id:          issue._id.toString(),
    projectId:   issue.projectId.toString(),
    title:       issue.title,
    description: issue.description,
    status:      issue.status,
    labels:      issue.labels,
    assigneeId:  issue.assigneeId ? issue.assigneeId.toString() : null,
    priority:    issue.priority,
    version:     issue.version,
    createdAt:   issue.createdAt.toISOString(),
    updatedAt:   issue.updatedAt.toISOString(),
  };
}

// Formats a Comment document → frontend shape
export function formatComment(comment: any): object {
  return {
    id:        comment._id.toString(),
    issueId:   comment.issueId.toString(),
    userId:    comment.userId.toString(),
    message:   comment.message,
    createdAt: comment.createdAt.toISOString(),
  };
}

// Formats a Project document → frontend shape
export function formatProject(project: any, issueCount = 0): object {
  const updatedMs  = Date.now() - new Date(project.updatedAt).getTime();
  const updatedAt  = humanRelativeTime(updatedMs);
  return {
    id:          project._id.toString(),
    name:        project.name,
    description: project.description,
    color:       project.color,
    memberIds:   (project.memberIds || []).map((id: any) => id.toString()),
    issueCount,
    updatedAt,
  };
}

function humanRelativeTime(ms: number): string {
  const s  = Math.floor(ms / 1000);
  const m  = Math.floor(s  / 60);
  const h  = Math.floor(m  / 60);
  const d  = Math.floor(h  / 24);
  const w  = Math.floor(d  / 7);
  if (s  < 60)  return 'Just now';
  if (m  < 60)  return `${m} minute${m > 1 ? 's' : ''} ago`;
  if (h  < 24)  return `${h} hour${h > 1 ? 's' : ''} ago`;
  if (d  < 7)   return `${d} day${d > 1 ? 's' : ''} ago`;
  if (w  < 4)   return `${w} week${w > 1 ? 's' : ''} ago`;
  return new Date(Date.now() - ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
