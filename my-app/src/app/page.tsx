"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import HeroSection from '@/components/HeroSection';
import VideoGrid from '@/components/VideoGrid';
import { Loader2 } from 'lucide-react';

// Type for user data from /api/auth/me
interface UserData {
  userId: string;
  email: string;
  username: string;
  accountType: string;
  permissions: Record<string, unknown> | null;
  permissionsUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  externalAccount: {
    username: string;
    email: string;
    accountType: string;
    permissions: {
      QC?: boolean;
      Upload?: boolean;
      ViewAssignments?: boolean;
    };
  } | null;
  isExternalVerified: boolean;
}

export default function Home() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 Checking authentication...');
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
          // Not authenticated - redirect to login
          console.log('❌ Not authenticated, redirecting to login...');
          router.push('/login');
          return;
        }

        const userData = await response.json();
        console.log('✅ Authenticated user:', userData);
        console.log('📦 External account data:', userData.externalAccount);
        setUser(userData);
      } catch (error) {
        console.error('❌ Auth check error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

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

  // Show loading state while checking auth
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

  // If not authenticated (user is null after loading), don't render anything
  // The useEffect will have already triggered the redirect
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />

      <main
        className={`flex-1 p-8 overflow-y-auto h-screen flex flex-col items-center transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}
      >
        <div className="w-full max-w-5xl space-y-16 pt-12">
          {/* Top Header Area (Search/Profile) - Hidden for now or moved to sidebar */}

          <HeroSection />

          {/* VideoGrid only renders for authenticated users */}
          <VideoGrid />
        </div>
      </main>
    </div>
  );
}

