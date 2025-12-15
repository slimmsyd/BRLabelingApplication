import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getExternalAccount } from '@/lib/external-api';

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
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!user) {
             return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Fetch external account data from /accounts API
        let externalAccount = null;
        if (user.username) {
            externalAccount = await getExternalAccount(user.username);
            console.log('📦 External account data:', externalAccount);
        }

        // Merge local user data with external account data
        const responseData = {
            // Local Prisma user data
            userId: user.id,
            email: user.email,
            username: user.username,
            accountType: user.accountType,
            permissions: user.permissions,
            permissionsUpdatedAt: user.permissionsUpdatedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            // External account data (from /accounts API)
            externalAccount: externalAccount ? {
                username: externalAccount.username,
                email: externalAccount.email,
                accountType: externalAccount.accountType,
                permissions: externalAccount.permissions,
            } : null,
            // Flag to indicate if user is verified in external system
            isExternalVerified: !!externalAccount,
        };

        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
