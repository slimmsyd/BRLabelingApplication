"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import HeroSection from '@/components/HeroSection';
import VideoGrid from '@/components/VideoGrid';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
