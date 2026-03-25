// src/models/Comment.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  _id:       mongoose.Types.ObjectId;
  issueId:   mongoose.Types.ObjectId;
  userId:    mongoose.Types.ObjectId;
  message:   string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    issueId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Issue',
      required: [true, 'Issue ID is required'],
      index:    true,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User ID is required'],
    },
    message: {
      type:      String,
      required:  [true, 'Message is required'],
      trim:      true,
      minlength: [1,    'Message cannot be empty'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
  },
  { timestamps: true }
);

commentSchema.index({ issueId: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
