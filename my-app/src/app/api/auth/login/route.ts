import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // LOG EXTERNAL ACCOUNTS IMMEDIATELY (even before password check for debugging)
        console.log('\n========================================');
        console.log('🔍 LOGIN ATTEMPT - CHECKING EXTERNAL ACCOUNTS');
        console.log('========================================');
        console.log('📧 Email attempting login:', email);
        
        const { getExternalAccountByEmail, getAllAccounts } = await import('@/lib/external-api');
        const externalAccount = await getExternalAccountByEmail(email);
        
        if (externalAccount) {
            console.log('✅ FOUND in external /accounts:');
            console.log('   👤 Username:', externalAccount.username);
            console.log('   📧 Email:', externalAccount.email);
            console.log('   🏷️  Account Type:', externalAccount.accountType);
            console.log('   🔐 Permissions:', JSON.stringify(externalAccount.permissions));
        } else {
            console.log('❌ NOT FOUND in external /accounts for email:', email);
            console.log('\n📋 ALL ACCOUNTS IN EXTERNAL SYSTEM:');
            const allAccounts = await getAllAccounts();
            if (allAccounts && allAccounts.length > 0) {
                allAccounts.forEach((acc, i) => {
                    console.log(`   [${i + 1}] ${acc.email} (${acc.username}) - ${acc.accountType}`);
                });
            }
        }
        console.log('========================================\n');

        if (!user) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Sync permissions from external account if found earlier
        if (externalAccount) {
            // Update permissions in local database
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    permissions: externalAccount.permissions,
                    permissionsUpdatedAt: new Date(),
                },
            });
            console.log('💾 Permissions cached to local database from external account');
        } else {
            console.log('❌ Account NOT found in external system for email:', user.email);
            console.log('⚠️  Using cached permissions from local database');
            console.log('   Last synced:', user.permissionsUpdatedAt || 'Never');
            console.log('----------------------------------------\n');
        }

        // Create session
        await createSession({
            userId: user.id,
            email: user.email,
            username: user.username,
        });

        console.log('✅ Login successful for user:', user.username);
        return NextResponse.json(
            { message: 'Login successful', userId: user.id, email: user.email, username: user.username },
            { status: 200 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}


