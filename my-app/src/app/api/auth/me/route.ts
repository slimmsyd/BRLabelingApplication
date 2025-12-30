import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getExternalAccountByEmail } from '@/lib/external-api';

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

        // Fetch external account data from /accounts API by EMAIL
        console.log('\n🔐 [/api/auth/me] ========================================');
        console.log('👤 Fetching user data for:', user.email);
        console.log('🔑 User ID:', user.id);
        console.log('📡 Calling getExternalAccountByEmail...');
        
        const externalAccount = await getExternalAccountByEmail(user.email);
        
        console.log('📥 External account fetch result:', externalAccount ? 'SUCCESS' : 'NULL/FAILED');
        
        // LOG ALL PERMISSIONS FOR DEBUGGING
        console.log('\n========================================');
        console.log('🔐 USER PERMISSIONS CHECK');
        console.log('========================================');
        console.log('👤 User:', user.username, `(${user.email})`);
        console.log('🏷️  Account Type:', user.accountType);
        console.log('\n📦 LOCAL CACHED PERMISSIONS (from Supabase):');
        if (user.permissions) {
            const perms = user.permissions as any;
            console.log('   • QC:', perms.QC ?? 'not set');
            console.log('   • Upload:', perms.Upload ?? 'not set');
            console.log('   • ViewAssignments:', perms.ViewAssignments ?? 'not set');
            console.log('   Last synced:', user.permissionsUpdatedAt || 'Never');
        } else {
            console.log('   ❌ No cached permissions');
        }
        
        console.log('\n🌐 EXTERNAL PERMISSIONS (from /accounts API):');
        if (externalAccount) {
            console.log('   ✅ External account found!');
            console.log('   • Username:', externalAccount.username);
            console.log('   • Email:', externalAccount.email);
            console.log('   • Account Type:', externalAccount.accountType);
            console.log('   • QC:', externalAccount.permissions?.QC ?? 'not set');
            console.log('   • Upload:', externalAccount.permissions?.Upload ?? 'not set');
            console.log('   • ViewAssignments:', externalAccount.permissions?.ViewAssignments ?? 'not set');
        } else {
            console.log('   ❌ Not found in external system');
            console.log('   ⚠️  This user will not have external permissions!');
        }
        console.log('========================================\n');

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

