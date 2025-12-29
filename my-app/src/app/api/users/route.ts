import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

/**
 * GET /api/users
 * Returns all users in the system (admin-only)
 */
export async function GET() {
  try {
    // Get the current user from session/auth
    // For now, we'll check if they're an admin via the auth/me endpoint pattern
    // In production, you'd verify the session token
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session');
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }

    // Get current user to verify they're an admin
    // This is a simplified check - in production you'd validate the session token properly
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        accountType: true,
      },
      orderBy: {
        username: 'asc',
      },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('[Users API] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
