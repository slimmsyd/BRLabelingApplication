'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

const AuthPageContent = () => {
    const searchParams = useSearchParams();
    const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Link href="/" className="inline-flex items-center text-sm text-foreground-secondary hover:text-foreground mb-8 transition-colors">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Home
                </Link>

                {mode === 'login' ? (
                    <LoginForm onToggleMode={toggleMode} />
                ) : (
                    <SignupForm onToggleMode={toggleMode} />
                )}
            </div>
        </div>
    );
};

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <AuthPageContent />
        </Suspense>
    );
}
