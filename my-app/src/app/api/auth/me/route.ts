import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { message: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Fetch user from DB to get latest role/details
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                email: true,
                username: true,
                accountType: true,
                permissions: true,
                permissionsUpdatedAt: true,
            }
        });

        if (!user) {
             return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { 
                userId: user.id, 
                email: user.email, 
                username: user.username,
                accountType: user.accountType,
                permissions: user.permissions,
                permissionsUpdatedAt: user.permissionsUpdatedAt,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
