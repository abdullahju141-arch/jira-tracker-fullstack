// ── Types ──────────────────────────────────────────────────────────────────────
export type Role = 'member';
export type Status = 'backlog' | 'in-progress' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  issueCount: number;
  updatedAt: string;
  color: string;
  memberIds: string[];
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: Status;
  labels: string[];
  assigneeId: string | null;
  priority: Priority;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  message: string;
  createdAt: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────
export const PRIORITY_CONFIG = {
  critical: { color: '#7c3aed', bg: '#f5f3ff', label: 'Critical', dot: '#7c3aed' },
  high:     { color: '#ef4444', bg: '#fef2f2', label: 'High',     dot: '#ef4444' },
  medium:   { color: '#f59e0b', bg: '#fffbeb', label: 'Medium',   dot: '#f59e0b' },
  low:      { color: '#22c55e', bg: '#f0fdf4', label: 'Low',      dot: '#22c55e' },
};

export const LABEL_CONFIG: Record<string, { bg: string; text: string }> = {
  feature:       { bg: '#ede9fe', text: '#7c3aed' },
  enhancement:   { bg: '#dbeafe', text: '#1d4ed8' },
  bug:           { bg: '#fee2e2', text: '#dc2626' },
  design:        { bg: '#fce7f3', text: '#be185d' },
  documentation: { bg: '#d1fae5', text: '#047857' },
  testing:       { bg: '#fef9c3', text: '#a16207' },
  security:      { bg: '#fef3c7', text: '#b45309' },
  performance:   { bg: '#e0f2fe', text: '#0369a1' },
  devops:        { bg: '#f0fdf4', text: '#166534' },
};

export const STATUS_CONFIG = {
  backlog:      { label: 'Backlog',      color: '#6366f1', bg: '#eef2ff' },
  'in-progress':{ label: 'In Progress',  color: '#f59e0b', bg: '#fffbeb' },
  done:         { label: 'Done',         color: '#22c55e', bg: '#f0fdf4' },
};

export const ALL_LABELS = Object.keys(LABEL_CONFIG);
