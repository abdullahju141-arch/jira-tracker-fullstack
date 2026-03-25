// src/controllers/usersController.ts
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { sendSuccess, sendError } from '../utils/response';

/**
 * GET /api/users
 * Returns all users (used for assignee dropdowns in frontend)
 */
export async function getAllUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await User.find({}).sort({ name: 1 });
    sendSuccess(res, { users: users.map(u => u.toFrontend()) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id
 * Returns a single user by ID
 */
export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }
    sendSuccess(res, { user: user.toFrontend() });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/profile
 * Protected — update own profile (name, color)
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, color } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { ...(name  ? { name  } : {}), ...(color ? { color } : {}) },
      { new: true, runValidators: true }
    );
    if (!user) { sendError(res, 'User not found', 404); return; }
    sendSuccess(res, { user: user.toFrontend() }, 'Profile updated');
  } catch (err) {
    next(err);
  }
}
