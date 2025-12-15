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

        // Fetch latest permissions from DEV API by EMAIL (more reliable than username)
        console.log('\n========================================');
        console.log('🔄 FETCHING EXTERNAL ACCOUNT DATA');
        console.log('========================================');
        console.log('📤 Looking up account by EMAIL:', user.email);
        
        // Import the email-based lookup function
        const { getExternalAccountByEmail } = await import('@/lib/external-api');
        const accountData = await getExternalAccountByEmail(user.email);
        
        // Log ALL data from external /accounts API
        console.log('\n📦 FULL RESPONSE FROM /accounts API:');
        console.log('----------------------------------------');
        if (accountData) {
            console.log('✅ Account found in external system!');
            console.log('   👤 Username:', accountData.username);
            console.log('   📧 Email:', accountData.email);
            console.log('   🏷️  Account Type:', accountData.accountType);
            console.log('   🔐 Permissions:');
            console.log('      • QC:', accountData.permissions?.QC ?? 'not set');
            console.log('      • Upload:', accountData.permissions?.Upload ?? 'not set');
            console.log('      • ViewAssignments:', accountData.permissions?.ViewAssignments ?? 'not set');
            console.log('\n   📋 Raw JSON:');
            console.log(JSON.stringify(accountData, null, 2));
            console.log('----------------------------------------\n');
            
            // Update permissions in local database
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    permissions: accountData.permissions,
                    permissionsUpdatedAt: new Date(),
                },
            });
            console.log('💾 Permissions cached to local database');
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


