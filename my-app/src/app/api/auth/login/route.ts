import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { getExternalAccount } from '@/lib/external-api';

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

        // Fetch latest permissions from DEV API and cache them
        console.log('🔄 Fetching permissions from DEV API for user:', user.username);
        const accountData = await getExternalAccount(user.username);
        
        if (accountData && accountData.permissions) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    permissions: accountData.permissions,
                    permissionsUpdatedAt: new Date(),
                },
            });
            console.log('✅ Permissions updated from DEV API:', accountData.permissions);
        } else {
            console.warn('⚠️ Could not fetch permissions from DEV API, using cached permissions');
            console.warn('⚠️ Last updated:', user.permissionsUpdatedAt || 'Never');
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


