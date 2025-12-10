'use client';

import React, { useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Video {
    id: string;
    title: string;
    boxer1: string;
    boxer2: string;
    round: number;
    fightDate: string;
    numCameraViews: number;
    createdAt: string;
}

const VideoGrid = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await fetch('/api/videos');
                if (!response.ok) {
                    throw new Error('Failed to fetch videos');
                }
                const data = await response.json();
                console.log("Loggin all the data", data)
                setVideos(data.videos);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="flex items-center justify-center mb-8">
                <h2 className="text-2xl font-medium text-foreground tracking-tight">Explore Projects</h2>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-accent-primary" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="text-center py-12">
                    <p className="text-red-500">{error}</p>
                </div>
            )}

            {/* Grid */}
            {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video) => (
                        <VideoCard
                            key={video.id}
                            id={video.id}
                            title={video.title}
                            boxer1={video.boxer1}
                            boxer2={video.boxer2}
                            round={video.round}
                            fightDate={video.fightDate}
                            numCameraViews={video.numCameraViews}
                            createdAt={video.createdAt}
                        />
                    ))}

                    {/* New Project Card (Dashed Border) */}
                    <Link href="/upload" className="group border border-dashed border-border hover:border-foreground-secondary rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors min-h-[300px]">
                        <div className="w-12 h-12 rounded-full border border-foreground-secondary flex items-center justify-center group-hover:bg-white/5 transition-colors">
                            <Plus size={24} className="text-foreground" />
                        </div>
                        <span className="font-medium text-foreground">Upload Video</span>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default VideoGrid;
