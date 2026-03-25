// src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { Role } from '../types';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name:      string;
  email:     string;
  password:  string;
  role:      Role;
  initials:  string;
  color:     string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  toFrontend(): FrontendUser;
}

// Shape returned to the frontend (matches frontend User interface)
export interface FrontendUser {
  id:       string;
  name:     string;
  email:    string;
  role:     Role;
  initials: string;
  color:    string;
}

const COLORS = [
  '#4f46e5','#7c3aed','#0891b2','#059669',
  '#dc2626','#d97706','#be185d','#0d9488',
];

const userSchema = new Schema<IUser>(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      minlength: [2,  'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [6,  'Password must be at least 6 characters'],
      select:   false, // never returned in queries by default
    },
    role: {
      type:    String,
      enum:    ['member'],
      default: 'member',
    },
    initials: { type: String, maxlength: 3 },
    color:    { type: String, default: '#4f46e5' },
  },
  { timestamps: true }
);

// ── Pre-save: hash password + compute initials + pick color ───────────────────
userSchema.pre<IUser>('save', async function (next) {
  // Hash password only when modified
  if (this.isModified('password')) {
    const salt   = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Compute initials from name
  if (this.isModified('name') || this.isNew) {
    this.initials = this.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Assign a color based on name hash (deterministic, never changes)
  if (this.isNew) {
    const hash  = this.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    this.color  = COLORS[hash % COLORS.length];
  }

  next();
});

// ── Methods ────────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Returns only the fields the frontend expects
userSchema.methods.toFrontend = function (): FrontendUser {
  return {
    id:       this._id.toString(),
    name:     this.name,
    email:    this.email,
    role:     this.role,
    initials: this.initials,
    color:    this.color,
  };
};

export const User = mongoose.model<IUser>('User', userSchema);
