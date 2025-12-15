"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import HeroSection from '@/components/HeroSection';
import VideoGrid from '@/components/VideoGrid';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // DEBUG: Fetch and log FIGHTS from DEV API on dashboard load (testing proxy)
  useEffect(() => {
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
          const errorData = await response.json();
          console.error('❌ DEBUG: Failed to fetch fights:', response.status, errorData);
        }
      } catch (error) {
        console.error('❌ DEBUG: Error fetching fights:', error);
      }
    };

    fetchFights();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />

      <main
        className={`flex-1 p-8 overflow-y-auto h-screen flex flex-col items-center transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}
      >
        <div className="w-full max-w-5xl space-y-16 pt-12">
          {/* Top Header Area (Search/Profile) - Hidden for now or moved to sidebar */}

          <HeroSection />

          <VideoGrid />
        </div>
      </main>
    </div>
  );
}
