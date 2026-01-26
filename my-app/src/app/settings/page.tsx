'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Shield, User, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import ExportReportsSection from '@/components/ExportReportsSection';

interface UserProfile {
    userId: string;
    email: string;
    username: string;
    accountType: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
                <Loader2 className="animate-spin text-accent-primary" size={32} />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border/50">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link
                        href="/"
                        className="p-2 -ml-2 hover:bg-white/5 rounded-full text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 p-6">
                <div className="max-w-3xl mx-auto space-y-8">

                    {/* Role Card */}
                    <div className="bg-surface border border-border rounded-xl p-6 flex items-start gap-4">
                        <div className="p-3 bg-accent-primary/10 rounded-lg">
                            <Shield className="text-accent-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-sm font-medium text-foreground-secondary uppercase tracking-wider mb-1">Current Role</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                    {user.accountType}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-primary/20 text-accent-primary border border-accent-primary/30 uppercase tracking-wide">
                                    Active
                                </span>
                            </div>
                            <p className="text-sm text-foreground-tertiary mt-2">
                                Role assigned by administrator. governs your permissions in the workspace.
                            </p>
                        </div>
                    </div>

                    {/* Personal Info */}
                    <div className="grid gap-6">
                        <h3 className="text-lg font-medium text-foreground">Profile Information</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Username */}
                            <div className="bg-surface/50 border border-border/50 rounded-lg p-4 group hover:border-border transition-colors">
                                <div className="flex items-center gap-3 mb-2 text-foreground-secondary">
                                    <User size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Username</span>
                                </div>
                                <div className="text-lg font-medium pl-7">{user.username}</div>
                            </div>

                            {/* Email */}
                            <div className="bg-surface/50 border border-border/50 rounded-lg p-4 group hover:border-border transition-colors">
                                <div className="flex items-center gap-3 mb-2 text-foreground-secondary">
                                    <Mail size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Email Address</span>
                                </div>
                                <div className="text-lg font-medium pl-7">{user.email}</div>
                            </div>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="space-y-6 pt-6 border-t border-border/50">
                        <h3 className="text-lg font-medium text-foreground">Security</h3>

                        <div className="bg-surface/30 border border-border/50 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white/5 rounded-lg mt-1">
                                    <Lock size={20} className="text-foreground-secondary" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">Password</h4>
                                    <p className="text-sm text-foreground-tertiary">Last changed 3 months ago</p>
                                </div>
                            </div>

                            <button
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-lg text-sm font-medium transition-colors cursor-not-allowed opacity-50"
                                disabled
                            >
                                Reset Password
                            </button>
                        </div>
                    </div>

                    {/* Export Reports - Admin/QC Only */}
                    {(user.accountType === 'ADMIN' || user.accountType === 'QUALITY_CONTROL') && (
                        <ExportReportsSection />
                    )}

                </div>
            </main>
        </div>
    );
}
