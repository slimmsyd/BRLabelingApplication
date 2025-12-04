'use client';

import React, { useEffect, useState } from 'react';
import { Play, Clock, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
    email: string;
    userId: string;
}

const HeroSection = () => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            router.refresh();
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
            <h1 className="text-4xl md:text-5xl font-medium text-foreground mb-12 tracking-tight">
                Labeling Interface
            </h1>

            {/* Active Session Card (The "Last Video") */}
            <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary/20 to-purple-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>

                <div className="relative bg-surface hover:bg-surface-hover border border-border rounded-2xl p-1 overflow-hidden transition-colors duration-300">
                    <div className="flex flex-col md:flex-row h-full">

                        {/* Video Preview (Left Side) */}
                        <div className="w-full md:w-2/5 aspect-video md:aspect-auto relative overflow-hidden rounded-xl bg-black">
                            <video
                                src="/TerranceHoward.mp4"
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 to-black/50"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-accent-primary group-hover:text-white transition-colors duration-300 z-10">
                                    <Play size={20} fill="currentColor" className="ml-1 text-white" />
                                </div>
                            </div>
                        </div>
                        {/* Content (Right Side) */}
                        <div className="flex-1 p-6 text-left flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                                    Active Session
                                </span>
                                <span className="text-xs text-foreground-secondary flex items-center gap-1">
                                    <Clock size={12} /> 2h ago
                                </span>
                            </div>

                            <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-accent-primary transition-colors">
                                <span>Crawford vs. Canelo</span>
                            </h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-xs text-foreground-secondary">
                                    <span>Progress</span>
                                    <span>12 / 45 events</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent-primary w-[27%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <Link href="/workspace" className="flex-1">
                                    <button className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-black font-medium rounded-lg hover:bg-white/90 transition-colors text-sm">
                                        Resume Labeling
                                    </button>
                                </Link>
                                <button className="px-4 py-2.5 cursor-pointer text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors border border-border rounded-lg hover:bg-white/5">
                                    Details
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
