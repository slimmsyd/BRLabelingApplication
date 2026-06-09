'use client';

import React from 'react';
import { Play, Clock, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

const HeroSection = () => {
    const router = useRouter();
    const { user, isLoading: loading, mutate } = useCurrentUser();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            // Clear the shared /api/auth/me cache for every consumer.
            await mutate(undefined, { revalidate: false });
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto mb-16 text-center relative">
            {/* Auth Buttons */}
            <div className="absolute -top-12 right-0 flex items-center gap-4">
                {loading ? (
                    <div className="h-10 w-32 bg-surface animate-pulse rounded-lg" />
                ) : user ? (
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-surface border border-border rounded-lg">
                            <span className="text-sm font-medium text-foreground">{user.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors cursor-pointer flex items-center gap-2"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                ) : (
                    <>
                        <Link href="/login">
                            <button className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors cursor-pointer">
                                Log In
                            </button>
                        </Link>
                        <Link href="/login?mode=signup">
                            <button className="px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors shadow-lg shadow-accent-primary/20 cursor-pointer">
                                Sign Up
                            </button>
                        </Link>
                    </>
                )}
            </div>

            {/* Main Title */}
            {/* <h1 className="text-4xl md:text-5xl font-medium text-foreground mb-12 tracking-tight">
                Labeling Interface
            </h1> */}

            {/* Active Session Card (The "Last Video") */}
            {/* Placeholder removed - waiting for real data */}
            {/* 
            <div className="relative group cursor-pointer">
                ...
            </div>
            */}
        </div>
    );
};

export default HeroSection;
