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
    sourceUrls: string[];
    createdAt: string;
    assignments?: Array<{
        user: {
            username: string | null;
            email: string;
        };
        status: string;
    }>;
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

    // Separate videos into assigned and unassigned
    const assignedVideos = videos.filter(video => video.assignments && video.assignments.length > 0);
    const unassignedVideos = videos.filter(video => !video.assignments || video.assignments.length === 0);

    return (
        <div className="w-full max-w-6xl mx-auto">
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

            {!loading && !error && (
                <div className="flex gap-8">
                    {/* Left Column: Assigned Projects */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-medium text-foreground tracking-tight">Explore Projects</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {assignedVideos.map((video) => (
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
                                    assignee={video.assignments?.[0] ? {
                                        ...video.assignments[0].user,
                                        status: video.assignments[0].status
                                    } : undefined}
                                    thumbnailUrl={video.sourceUrls?.[0]}
                                />
                            ))}

                            {/* Upload Video Card */}
                            <Link href="/upload" className="group border border-dashed border-border hover:border-foreground-secondary rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors min-h-[300px]">
                                <div className="w-12 h-12 rounded-full border border-foreground-secondary flex items-center justify-center group-hover:bg-white/5 transition-colors">
                                    <Plus size={24} className="text-foreground" />
                                </div>
                                <span className="font-medium text-foreground">Upload Video</span>
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: In Queue (Unassigned) */}
                    <div className="w-80 shrink-0">
                        <div className="flex items-center gap-2 mb-6">
                            <h3 className="text-lg font-medium text-foreground tracking-tight">In Queue</h3>
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                                {unassignedVideos.length}
                            </span>
                        </div>

                        {unassignedVideos.length === 0 ? (
                            <div className="border border-dashed border-border rounded-xl p-6 text-center">
                                <p className="text-sm text-foreground-secondary">No videos waiting for assignment</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {unassignedVideos.map((video) => (
                                    <div
                                        key={video.id}
                                        className="bg-surface border border-border rounded-xl p-4 hover:border-foreground-secondary/50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                                <span className="text-amber-500 text-xs font-bold">R{video.round}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-foreground truncate">{video.title}</h4>
                                                <p className="text-xs text-foreground-secondary mt-0.5">
                                                    {video.boxer1} vs {video.boxer2}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                                                        AWAITING PICKUP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-foreground-secondary mt-4 text-center">
                            Videos waiting to be picked up by team members
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoGrid;
