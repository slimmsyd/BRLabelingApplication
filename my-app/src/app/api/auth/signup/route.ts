import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { email, password, accountType } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
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
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'User already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with specified accountType (defaults to LABELER if not provided)
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                accountType: accountType || 'LABELER',
            },
        });

        // Create session
        await createSession({
            userId: user.id,
            email: user.email,
        });

        return NextResponse.json(
            { message: 'User created successfully', userId: user.id, email: user.email },
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
