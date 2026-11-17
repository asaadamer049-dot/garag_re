import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fleet-erp-onprem-super-secret-key-change-in-production-2026'
);

export const COOKIE_NAME = 'fleet_erp_session';

export interface UserSession {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  departmentId?: string | null;
  roles: string[];
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(requiredPermission?: string): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  if (requiredPermission && !user.roles.includes('ADMIN') && !user.permissions.includes(requiredPermission)) {
    throw new Error('FORBIDDEN');
  }

  return user;
}
