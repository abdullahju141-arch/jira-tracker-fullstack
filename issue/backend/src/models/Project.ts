// src/models/Project.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  _id:         mongoose.Types.ObjectId;
  name:        string;
  description: string;
  color:       string;
  memberIds:   mongoose.Types.ObjectId[];
  ownerId:     mongoose.Types.ObjectId;
  createdAt:   Date;
  updatedAt:   Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type:      String,
      required:  [true, 'Project name is required'],
      trim:      true,
      minlength: [2,   'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type:    String,
      trim:    true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    color: {
      type:    String,
      default: '#4f46e5',
      match:   [/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'],
    },
    ownerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Virtual: issue count (populated on demand)
projectSchema.virtual('issueCount', {
  ref:          'Issue',
  localField:   '_id',
  foreignField: 'projectId',
  count:        true,
});

projectSchema.index({ ownerId: 1 });
projectSchema.index({ memberIds: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
