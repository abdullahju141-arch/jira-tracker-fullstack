// src/types/index.ts
// All types mirror the frontend lib/mockData.ts exactly

export type Role     = 'member';
export type Status   = 'backlog' | 'in-progress' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type WSEventType =
  | 'issue.created'
  | 'issue.updated'
  | 'issue.deleted'
  | 'comment.added'
  | 'project.updated';

export interface WSMessage {
  type:    WSEventType;
  payload: unknown;
}

// JWT payload stored in token
export interface JwtPayload {
  id:    string;
  email: string;
  role:  Role;
  iat?:  number;
  exp?:  number;
}

// Express request extended with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id:    string;
        email: string;
        role:  Role;
        name:  string;
      };
    }
  }
}
