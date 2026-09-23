"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import HeroSection from '@/components/HeroSection';
import VideoGrid from '@/components/VideoGrid';
import MobileTopBar from '@/components/MobileTopBar';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

export default function Home() {
  const router = useRouter();
  // Desktop collapse/expand (unchanged)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // ── ADDED: mobile drawer open/closed (independent of desktop collapse) ──
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, isLoading: loading, error } = useCurrentUser();

  useEffect(() => {
    if (error) router.push('/login');
  }, [error, router]);

  // close the drawer whenever we cross into desktop, so it can't get stuck open
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (mq.matches) setMobileNavOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((o) => !o);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-accent-primary" />
          <p className="text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* ── ADDED: mobile backdrop (only < lg, only when drawer open) ── */}
      <div
        onClick={() => setMobileNavOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${mobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sidebar: fixed column on desktop, slide-in drawer on mobile */}
      <Sidebar
        isOpen={isSidebarOpen}
        toggle={toggleSidebar}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <main
        className={`flex-1 overflow-y-auto h-screen flex flex-col items-center transition-all duration-300 ease-in-out
          p-4 ml-0
          lg:p-8 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}
      >
        {/* ── ADDED: mobile top bar with hamburger (hidden on desktop) ── */}
        <MobileTopBar onMenu={() => setMobileNavOpen(true)} />

        <div className="w-full max-w-5xl space-y-10 lg:space-y-16 pt-4 lg:pt-12">
          <HeroSection />
          <VideoGrid />
        </div>
      </main>
    </div>
  );
}
