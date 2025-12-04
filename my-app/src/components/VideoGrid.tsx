import React from 'react';
import VideoCard from './VideoCard';
import { Plus } from 'lucide-react';

const VideoGrid = () => {
    // Mock data
    const videos = [
        {
            id: 1,
            title: "Crawford vs. Canelo",
            progress: 45,
            totalEvents: 45,
            status: 'completed' as const,
            lastWorked: "1 day ago"
        },
        {
            id: 2,
            title: "Joshua vs. Ngannou",
            progress: 12,
            totalEvents: 60,
            status: 'in_progress' as const,
            lastWorked: "3 days ago"
        },
        {
            id: 3,
            title: "Canelo vs. Munguia",
            progress: 0,
            totalEvents: 0,
            status: 'new' as const,
            lastWorked: "Added yesterday"
        },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="flex items-center justify-center mb-8">
                <h2 className="text-2xl font-medium text-foreground tracking-tight">Explore Projects</h2>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                    <VideoCard
                        key={video.id}
                        title={video.title}
                        progress={video.progress}
                        totalEvents={video.totalEvents}
                        status={video.status}
                        lastWorked={video.lastWorked}
                    />
                ))}

                {/* New Project Card (Dashed Border) */}
                <div className="group border border-dashed border-border hover:border-foreground-secondary rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors min-h-[300px]">
                    <div className="w-12 h-12 rounded-full border border-foreground-secondary flex items-center justify-center group-hover:bg-white/5 transition-colors">
                        <Plus size={24} className="text-foreground" />
                    </div>
                    <span className="font-medium text-foreground">New Project</span>
                </div>
            </div>
        </div>
    );
};

export default VideoGrid;
