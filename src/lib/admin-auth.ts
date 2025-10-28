import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { query as db } from '@/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  email: string;
  instanceRole: 'USER' | 'ADMIN';
}

export interface AdminAuthContext {
  userId: string;
  email: string;
  instanceRole: 'USER' | 'ADMIN';
  isAdmin: boolean;
}

/**
 * Extract and verify JWT token from request
 */
export async function extractAdminAuth(request: NextRequest): Promise<AdminAuthContext | null> {
  try {
    // Try to get token from cookie first
    let token = request.cookies.get('auth_token')?.value;

    // If not in cookie, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      instanceRole: decoded.instanceRole,
      isAdmin: decoded.instanceRole === 'ADMIN',
    };
  } catch (error) {
    console.error('Error extracting admin auth:', error);
    return null;
  }
}

/**
 * Middleware to require admin authentication
 * Returns 401 if not authenticated, 403 if not admin
 */
export async function requireAdminAuth(request: NextRequest): Promise<
  | { success: true; auth: AdminAuthContext }
  | { success: false; error: string; status: number }
> {
  const auth = await extractAdminAuth(request);

  if (!auth) {
    return {
      success: false,
      error: 'Authentication required',
      status: 401,
    };
  }

  if (!auth.isAdmin) {
    return {
      success: false,
      error: 'Admin access required',
      status: 403,
    };
  }

  return {
    success: true,
    auth,
  };
}

/**
 * Helper to get database query function
 */
export { db };
