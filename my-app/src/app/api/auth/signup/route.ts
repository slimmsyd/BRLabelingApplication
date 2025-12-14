import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { createExternalUser, getExternalAccount, getAllAccounts, toExternalAccountType } from '@/lib/external-api';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        // DEBUG: Log all existing accounts from DEV API
        console.log('\n========== DEBUG: CHECKING DEV API ==========');
        await getAllAccounts();
        console.log('==============================================\n');

        const { email, password, username, accountType } = await req.json();

        if (!email || !password || !username) {
            return NextResponse.json(
                { message: 'Email, username, and password are required' },
                { status: 400 }
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

        // Check if user already exists
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

        // STEP 1: Create user in DEV API FIRST (PRIORITY)
        console.log('🔄 Creating user in DEV API...');
        const externalSuccess = await createExternalUser({
            username,
            email,
            accountType: toExternalAccountType(finalAccountType),
        });

        if (!externalSuccess) {
            console.error('❌ CRITICAL: Failed to create user in DEV API');
            return NextResponse.json(
                { 
                    message: 'Failed to create account in external system. Please contact support or try again later.',
                    error: 'EXTERNAL_API_FAILURE' 
                },
                { status: 500 }
            );
        }

        // STEP 2: Create user in our local database (backup/cache)
        console.log('🔄 Creating user in local database...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                accountType: finalAccountType,
            },
        });
        console.log('✅ User created in local DB:', user.id);

        // STEP 3: Fetch permissions from DEV API immediately
        console.log('🔄 Fetching permissions from DEV API...');
        const accountData = await getExternalAccount(username);
        
        if (accountData && accountData.permissions) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    permissions: accountData.permissions,
                    permissionsUpdatedAt: new Date(),
                },
            });
            console.log('✅ Permissions cached:', accountData.permissions);
        } else {
            console.warn('⚠️ Could not fetch permissions from DEV API, user created without cached permissions');
        }

        // STEP 4: Create session
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


