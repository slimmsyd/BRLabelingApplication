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

        // External account dump on login was for debugging Hueman /accounts sync
        // (match email, dump full list on miss). Silenced for local testing — host is dead
        // and we rely on cached local permissions. Uncomment logs when re-wiring EXTERNAL_API_*.
        const { getExternalAccountByEmail } = await import('@/lib/external-api');
        const externalAccount = await getExternalAccountByEmail(email);
        // if (externalAccount) {
        //   console.log('✅ FOUND in external /accounts:', externalAccount.email, externalAccount.accountType);
        // } else {
        //   console.log('❌ NOT FOUND in external /accounts for email:', email);
        //   const { getAllAccounts } = await import('@/lib/external-api');
        //   const allAccounts = await getAllAccounts();
        //   ...
        // }

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
            // console.log('💾 Permissions cached to local database from external account');
        }
        // else: external miss → use cached local permissions (expected for local testing)

        // Create session
        await createSession({
            userId: user.id,
            email: user.email,
            username: user.username,
        });

        // console.log('✅ Login successful for user:', user.username);
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


