import Sidebar from '@/components/Sidebar';
import HeroSection from '@/components/HeroSection';
import VideoGrid from '@/components/VideoGrid';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen flex flex-col items-center">
        <div className="w-full max-w-5xl space-y-16 pt-12">
          {/* Top Header Area (Search/Profile) - Hidden for now or moved to sidebar */}

          <HeroSection />

          <VideoGrid />
        </div>
      </main>
    </div>
  );
}
