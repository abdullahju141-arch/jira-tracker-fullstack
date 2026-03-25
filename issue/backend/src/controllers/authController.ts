// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 * Response: { token, refreshToken, user }
 */
export async function register(
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

    // Roles are simplified: new users can do everything.
    // We intentionally ignore any `role` provided by the client.
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const user = await User.create({ name, email, password, role: 'member' });

    const tokenPayload = {
      id:    user._id.toString(),
      email: user.email,
      role:  user.role,
    };

    const token        = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    sendSuccess(
      res,
      { token, refreshToken, user: user.toFrontend() },
      'Account created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { token, refreshToken, user }
 */
export async function login(
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

    const { email, password } = req.body;

    // Explicitly select password (it's excluded by default via select: false)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const tokenPayload = {
      id:    user._id.toString(),
      email: user.email,
      role:  user.role,
    };

    const token        = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    sendSuccess(res, { token, refreshToken, user: user.toFrontend() }, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Response: { token }
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken: rt } = req.body;
    if (!rt) {
      sendError(res, 'Refresh token is required', 400);
      return;
    }

    const decoded = verifyRefreshToken(rt);

    // Confirm user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      sendError(res, 'User no longer exists', 401);
      return;
    }

    const token = signAccessToken({
      id:    user._id.toString(),
      email: user.email,
      role:  user.role,
    });

    sendSuccess(res, { token }, 'Token refreshed');
  } catch (err: any) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      sendError(res, 'Invalid or expired refresh token', 401);
      return;
    }
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Protected — returns current user
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }
    sendSuccess(res, { user: user.toFrontend() }, 'Current user');
  } catch (err) {
    next(err);
  }
}
