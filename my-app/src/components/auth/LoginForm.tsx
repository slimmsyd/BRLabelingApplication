'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';

interface LoginFormProps {
    onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            router.push('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                    Welcome Back
                </h1>
                <p className="text-sm text-foreground-secondary">
                    Enter your credentials to access your workspace
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1.5 uppercase tracking-wider">
                        Email Address
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={16} className="text-foreground-secondary" />
                        </div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-foreground-secondary mb-1.5 uppercase tracking-wider">
                        Password
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="text-foreground-secondary" />
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-500">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent-primary text-white font-medium py-2.5 rounded-lg hover:bg-accent-primary/90 transition-colors shadow-lg shadow-accent-primary/20 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-foreground-secondary">
                    Don't have an account?{' '}
                    <button
                        onClick={onToggleMode}
                        className="text-accent-primary hover:underline font-medium cursor-pointer"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};
