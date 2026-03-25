// src/models/Issue.ts
import mongoose, { Document, Schema } from 'mongoose';
import type { Status, Priority } from '../types';

export interface IIssue extends Document {
  _id:         mongoose.Types.ObjectId;
  projectId:   mongoose.Types.ObjectId;
  title:       string;
  description: string;
  status:      Status;
  labels:      string[];
  assigneeId:  mongoose.Types.ObjectId | null;
  priority:    Priority;
  version:     number;   // optimistic concurrency control
  createdAt:   Date;
  updatedAt:   Date;
}

const VALID_LABELS = [
  'feature','enhancement','bug','design',
  'documentation','testing','security','performance','devops',
];

const issueSchema = new Schema<IIssue>(
  {
    projectId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Project',
      required: [true, 'Project ID is required'],
      index:    true,
    },
    title: {
      type:      String,
      required:  [true, 'Title is required'],
      trim:      true,
      minlength: [3,   'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type:    String,
      trim:    true,
      default: '',
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    status: {
      type:     String,
      enum:     { values: ['backlog','in-progress','done'], message: 'Invalid status: {VALUE}' },
      default:  'backlog',
    },
    labels: {
      type:     [String],
      default:  [],
      validate: {
        validator: (arr: string[]) => arr.every(l => VALID_LABELS.includes(l)),
        message:   'One or more labels are invalid',
      },
    },
    assigneeId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    priority: {
      type:    String,
      enum:    { values: ['low','medium','high','critical'], message: 'Invalid priority: {VALUE}' },
      default: 'medium',
    },
    version: {
      type:    Number,
      default: 1,
      min:     1,
    },
  },
  { timestamps: true }
);

// Compound indexes for the most common query patterns
issueSchema.index({ projectId: 1, status: 1 });
issueSchema.index({ projectId: 1, priority: 1 });
issueSchema.index({ projectId: 1, assigneeId: 1 });
issueSchema.index({ projectId: 1, labels: 1 });

// Increment version on every save (optimistic concurrency)
issueSchema.pre('save', function (next) {
  if (!this.isNew) this.version += 1;
  next();
});

export const Issue = mongoose.model<IIssue>('Issue', issueSchema);
