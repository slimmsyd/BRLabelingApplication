"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import HeroSection from '@/components/HeroSection';
import VideoGrid from '@/components/VideoGrid';
import MobileTopBar from '@/components/MobileTopBar';
import UploadFab from '@/components/UploadFab';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

export default function Home() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Mobile drawer open/closed (independent of the desktop collapse state)
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, isLoading: loading, error } = useCurrentUser();

  // Close the drawer whenever we cross into desktop, so it can't get stuck open
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (mq.matches) setMobileNavOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Not authenticated -> redirect to login
  useEffect(() => {
    if (error) router.push('/login');
  }, [error, router]);

  // DEBUG: Fetch and log FIGHTS from DEV API on dashboard load (testing proxy)
  useEffect(() => {
    // Only fetch fights if user is authenticated
    if (!user) return;

    const fetchFights = async () => {
      try {
        console.log('🔍 DEBUG: Fetching fights via proxy...');
        // Use local proxy to avoid CORS - this calls our backend which then calls DEV API
        const response = await fetch('/api/external/fights');
        console.log('🔍 DEBUG: Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ DEBUG: Fights from DEV API:', data);
        } else {
          console.error('❌ DEBUG: Failed to fetch fights:', response.status);
        }
      } catch (error) {
        console.error('❌ DEBUG: Error fetching fights:', error);
      }
    };

    fetchFights();
  }, [user]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Parallelized loading: the dashboard shell renders immediately so the
  // sidebar/video fetches start alongside /api/auth/me instead of after it.
  // Only bail once auth has definitively failed (the redirect is in flight).
  if (error || (!loading && !user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Mobile backdrop (only < lg, only when drawer open) */}
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
        className={`flex-1 overflow-y-auto h-screen flex flex-col items-center transition-all duration-300 ease-in-out p-4 ml-0 lg:p-8 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}
      >
        {/* Mobile top bar with hamburger (hidden on desktop) */}
        <MobileTopBar onMenu={() => setMobileNavOpen(true)} />

        <div className="w-full max-w-5xl space-y-10 lg:space-y-16 pt-4 lg:pt-12">
          {/* Top Header Area (Search/Profile) - Hidden for now or moved to sidebar */}

          <HeroSection />

          {/* VideoGrid only renders for authenticated users */}
          <VideoGrid />
        </div>

        {/* Floating upload action on mobile */}
        <UploadFab />
      </main>
    </div>
  );
}

