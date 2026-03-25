// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';
import { sendError } from '../utils/response';

/**
 * protect — verifies JWT and attaches req.user
 */
export async function protect(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      sendError(res, 'User no longer exists', 401);
      return;
    }

    req.user = {
      id:    user._id.toString(),
      email: user.email,
      role:  user.role,
      name:  user.name,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Token expired, please login again', 401);
      return;
    }
    sendError(res, 'Invalid token', 401);
  }
}

// Note: role-based authorization has been removed to match the simplified frontend.
