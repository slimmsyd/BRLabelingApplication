import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with specified accountType (defaults to LABELER if not provided)
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                accountType: accountType || 'LABELER',
            },
        });

        // Create session
        await createSession({
            userId: user.id,
            email: user.email,
            username: user.username,
        });

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
