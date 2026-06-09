import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getExternalAccountByEmail, normalizeAccountType, type PermissionResponse } from '@/lib/external-api';

// External /accounts sync is expensive (downloads the full account list). Only
// re-sync when the cached permissions are older than this window.
const EXTERNAL_SYNC_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

        // External /accounts is the source of truth for ADMIN/QC roles, but the
        // call is expensive. Only re-sync if the cached permissions are stale.
        const lastSync = user.permissionsUpdatedAt
            ? new Date(user.permissionsUpdatedAt).getTime()
            : 0;
        const isFresh = lastSync > 0 && Date.now() - lastSync < EXTERNAL_SYNC_TTL_MS;

        let externalAccount: PermissionResponse | null = null;
        let effectiveAccountType = user.accountType;
        let effectivePermissions = user.permissions;

        if (!isFresh) {
            externalAccount = await getExternalAccountByEmail(user.email);

            // On every SUCCESSFUL sync we advance permissionsUpdatedAt so the TTL
            // window actually moves forward (even when the role is unchanged).
            // A failed fetch leaves the timestamp stale so it retries next request.
            if (externalAccount?.accountType) {
                const normalizedType = normalizeAccountType(externalAccount.accountType);
                effectiveAccountType = normalizedType;
                effectivePermissions = externalAccount.permissions ?? user.permissions;
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        accountType: normalizedType,
                        permissions: externalAccount.permissions ?? undefined,
                        permissionsUpdatedAt: new Date(),
                    },
                });
            }
        }

        // When serving from cache (fresh), reconstruct externalAccount from the
        // last-synced local fields so the settings page's CONNECTED badge and
        // local-vs-external comparison keep working without a live call.
        const externalAccountForResponse = externalAccount
            ? {
                username: externalAccount.username,
                email: externalAccount.email,
                accountType: externalAccount.accountType,
                permissions: externalAccount.permissions,
            }
            : user.permissionsUpdatedAt
                ? {
                    username: user.username,
                    email: user.email,
                    accountType: effectiveAccountType,
                    permissions: (user.permissions ?? {}) as PermissionResponse['permissions'],
                }
                : null;

        const responseData = {
            // Local Prisma user data
            userId: user.id,
            email: user.email,
            username: user.username,
            accountType: effectiveAccountType,
            permissions: effectivePermissions,
            permissionsUpdatedAt: user.permissionsUpdatedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            // External account data (live when synced, cached when fresh)
            externalAccount: externalAccountForResponse,
            // Flag to indicate if user is verified in external system
            isExternalVerified: externalAccountForResponse !== null,
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

