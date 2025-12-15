import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { getExternalAccountByEmail } from '@/lib/external-api';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { email, password, username, accountType } = await req.json();

        if (!email || !password || !username) {
            return NextResponse.json(
                { message: 'Email, username, and password are required' },
                { status: 400 }
            );
        }

        // PRIVATE: Restrict signups to authorized domain only
        // This restriction is intentionally hidden from users
        const ALLOWED_DOMAIN = 'boxraw.com';
        const emailDomain = email.toLowerCase().split('@')[1];
        
        if (emailDomain !== ALLOWED_DOMAIN) {
            console.log(`⛔ Signup blocked: ${email} (domain ${emailDomain} not authorized)`);
            // Return generic error - don't reveal domain restriction
            return NextResponse.json(
                { message: 'Unable to create account. Please contact an administrator.' },
                { status: 403 }
            );
        }

        // Validate accountType - only allow LABELER or QUALITY_CONTROL
        // ADMIN accounts must be set manually in the backend
        if (accountType && accountType !== 'LABELER' && accountType !== 'QUALITY_CONTROL') {
            return NextResponse.json(
                { message: 'Invalid account type' },
                { status: 400 }
            );
        }

        // Check if user already exists in local database
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'User with this email or username already exists' },
                { status: 400 }
            );
        }

        const finalAccountType = accountType || 'LABELER';

        // STEP 1: Check if email exists in external /accounts API
        console.log('\n========================================');
        console.log('🔍 CHECKING EXTERNAL ACCOUNTS BY EMAIL');
        console.log('========================================');
        console.log('📧 Email:', email);
        
        const externalAccount = await getExternalAccountByEmail(email);
        
        if (externalAccount) {
            console.log('✅ Found in external system:');
            console.log('   👤 Username:', externalAccount.username);
            console.log('   🏷️  Account Type:', externalAccount.accountType);
            console.log('   🔐 Permissions:', JSON.stringify(externalAccount.permissions));
        } else {
            console.log('⚠️ Email not found in external /accounts');
            console.log('   User will be created without permissions');
        }
        console.log('========================================\n');

        // STEP 2: Create user in local Supabase/Prisma database ONLY
        console.log('🔄 Creating user in local database...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                accountType: finalAccountType,
                // If found in external system, cache their permissions
                ...(externalAccount?.permissions && {
                    permissions: externalAccount.permissions,
                    permissionsUpdatedAt: new Date(),
                }),
            },
        });
        console.log('✅ User created in local DB:', user.id);

        if (externalAccount) {
            console.log('💾 Permissions synced from external account');
        }

        // STEP 3: Create session
        await createSession({
            userId: user.id,
            email: user.email,
            username: user.username,
        });

        console.log('✅ Signup complete for user:', username);
        return NextResponse.json(
            { message: 'User created successfully', userId: user.id, email: user.email, username: user.username },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
