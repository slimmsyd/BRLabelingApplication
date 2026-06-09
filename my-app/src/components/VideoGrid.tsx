'use client';

import React, { useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import AssignmentModal from './AssignmentModal';
import { Plus, Loader2, UserPlus, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { canAssignRounds } from '@/lib/permissions';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

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
        id: string;
        userId: string;
        user: { id: string;                         
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
    const { user: currentUser } = useCurrentUser();
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedVideoForAssign, setSelectedVideoForAssign] = useState<{ id: string; title: string; currentAssigneeUserId?: string } | null>(null);


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

    const handleRefreshVideos = async () => {
        console.log('[VideoGrid] Refreshing videos after assignment change...');
        try {
            const response = await fetch('/api/videos');
            if (response.ok) {
                const data = await response.json();
                console.log('[VideoGrid] Videos refreshed, count:', data.videos?.length);
                setVideos(data.videos);
            }
        } catch (err) {
            console.error('[VideoGrid] Failed to refresh videos:', err);
        }
    };

    // Handle video deletion
    const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
        setDeleting(true);
        try {
            console.log(`🗑️ [VideoGrid] Deleting video: ${videoTitle} (${videoId})`);
            const response = await fetch(`/api/videos/${videoId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete video');
            }

            const result = await response.json();
            console.log('✅ [VideoGrid] Video deleted:', result);

            // Close modals and refresh
            setDeleteConfirmId(null);
            setOpenDropdownId(null);
            await handleRefreshVideos();
        } catch (err) {
            console.error('❌ [VideoGrid] Delete error:', err);
            alert(err instanceof Error ? err.message : 'Failed to delete video');
        } finally {
            setDeleting(false);
        }
    };

    // Filter out submitted videos (SUBMITTED, REVIEWED, COMPLETED)
    const submittedStatuses = ['SUBMITTED', 'REVIEWED', 'COMPLETED'];
    const isVideoSubmitted = (video: Video) => {
        return video.assignments && video.assignments.some(a => submittedStatuses.includes(a.status));
    };

    // Separate videos into assigned, unassigned, and filter out submitted
    const activeVideos = videos.filter(video => !isVideoSubmitted(video));
    const assignedVideos = activeVideos.filter(video => video.assignments && video.assignments.length > 0);
    const unassignedVideos = activeVideos.filter(video => !video.assignments || video.assignments.length === 0);

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
                                    canAssign={canAssignRounds(currentUser?.email)}
                                    assignmentId={video.assignments?.[0]?.id}
                                    onAssignmentChange={handleRefreshVideos}
                                    onAssignClick={() => {
                                        const currentAssigneeUserId = video.assignments?.[0]?.userId;
                                        console.log('[VideoGrid] Reassigning video:', video.title, 'Current assignee:', currentAssigneeUserId);
                                        setSelectedVideoForAssign({
                                            id: video.id,
                                            title: video.title,
                                            currentAssigneeUserId
                                        });
                                        setAssignModalOpen(true);
                                    }}
                                />
                            ))}

                        </div>
                    </div>

                    {/* Right Column: In Queue (Unassigned) */}
                    <div className="w-80 shrink-0 space-y-6">
                        {/* Upload Video Indicator */}
                        <Link
                            href="/upload"
                            className="flex items-center justify-between p-4 bg-accent-primary group hover:bg-accent-primary/90 rounded-2xl transition-all duration-300 shadow-lg shadow-accent-primary/10 border border-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <Plus size={20} className="text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white">Upload Video</span>
                                    <span className="text-[10px] text-white/60">Add new footage</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                                <Plus size={14} />
                            </div>
                        </Link>

                        <div>
                            <div className="flex items-center gap-2 mb-4">
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
                                        <div key={video.id} className="relative">
                                            <Link
                                                href={`/workspace?videoId=${video.id}`}
                                                className="block bg-surface border border-border rounded-xl p-3 hover:border-foreground-secondary/50 transition-colors cursor-pointer group/card"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Video Preview Thumbnail */}
                                                    <div className="w-24 h-16 rounded-lg bg-black overflow-hidden shrink-0 relative border border-white/10">
                                                        {video.sourceUrls?.[0] ? (
                                                            <video
                                                                src={video.sourceUrls[0]}
                                                                className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity"
                                                                muted
                                                                playsInline
                                                                onMouseOver={e => e.currentTarget.play()}
                                                                onMouseOut={e => {
                                                                    e.currentTarget.pause();
                                                                    e.currentTarget.currentTime = 0;
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-foreground-secondary">
                                                                <span className="text-xs">No Video</span>
                                                            </div>
                                                        )}
                                                        {/* Round Badge Overlay */}
                                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[8px] font-bold text-white border border-white/10">
                                                            R{video.round}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0 py-0.5">
                                                        <h4 className="text-sm font-medium text-foreground truncate group-hover/card:text-accent-primary transition-colors">{video.title}</h4>
                                                        <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                                                            {video.boxer1} vs {video.boxer2}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                                                                AWAITING PICKUP
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Assign Button — only round-assigners (see ROUND_ASSIGNERS) */}
                                            {canAssignRounds(currentUser?.email) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedVideoForAssign({ id: video.id, title: video.title });
                                                        setAssignModalOpen(true);
                                                    }}
                                                    className="absolute top-2 right-10 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary/90 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all z-10"
                                                >
                                                    <UserPlus size={12} />
                                                    ASSIGN
                                                </button>
                                            )}

                                            {/* 3-Dot Menu — Delete Video (admins keep this) */}
                                            {currentUser?.accountType === 'ADMIN' && (
                                                    <div className="absolute top-2 right-2 z-20">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setOpenDropdownId(openDropdownId === video.id ? null : video.id);
                                                            }}
                                                            className="w-7 h-7 bg-surface/90 hover:bg-surface border border-border hover:border-foreground-secondary/50 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm"
                                                        >
                                                            <MoreVertical size={14} className="text-foreground-secondary" />
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {openDropdownId === video.id && (
                                                            <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setDeleteConfirmId(video.id);
                                                                        setOpenDropdownId(null);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Delete Video
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-foreground-secondary mt-4 text-center">
                                Videos waiting to be picked up by team members
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {selectedVideoForAssign && (
                <AssignmentModal
                    isOpen={assignModalOpen}
                    onClose={() => {
                        setAssignModalOpen(false);
                        setSelectedVideoForAssign(null);
                    }}
                    videoId={selectedVideoForAssign.id}
                    videoTitle={selectedVideoForAssign.title}
                    currentAssigneeId={selectedVideoForAssign.currentAssigneeUserId}
                    onAssignmentSuccess={handleRefreshVideos}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirmId && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => !deleting && setDeleteConfirmId(null)}
                >
                    <div
                        className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                <Trash2 size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">Delete Video?</h3>
                                <p className="text-sm text-foreground-secondary">
                                    Are you sure you want to delete <span className="font-medium text-foreground">"{unassignedVideos.find(v => v.id === deleteConfirmId)?.title}"</span>? This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground bg-transparent hover:bg-surface-hover rounded-lg transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const video = unassignedVideos.find(v => v.id === deleteConfirmId);
                                    if (video) {
                                        handleDeleteVideo(video.id, video.title);
                                    }
                                }}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoGrid;
