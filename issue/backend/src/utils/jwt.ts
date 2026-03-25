// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types';

function getSecret(key: string): string {
  const s = process.env[key];
  if (!s) throw new Error(`${key} is not set in environment variables`);
  return s;
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSecret('JWT_SECRET'), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_SECRET')) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as JwtPayload;
}
