'use client';

import React, { useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import AssignmentModal from './AssignmentModal';
import FeedbackWidget from './FeedbackWidget';
import { Plus, Loader2, UserPlus, MoreVertical, Trash2, SlidersHorizontal, ChevronDown, ChevronRight, Layers } from 'lucide-react';
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
        user: {
            id: string;
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

    // ── ADDED: filter bar state (center "Explore Projects") ──────────────────
    const [statusFilter, setStatusFilter] = useState<'All' | 'Unassigned' | 'In Progress'>('In Progress');
    const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
    const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
    // ── ADDED: queue grouping state (right "In Queue" rail) ──────────────────
    const [groupQueue, setGroupQueue] = useState(true); // group by event (matchup)
    // Groups start collapsed (chip strip); a click expands to the full rows.
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await fetch('/api/videos');
                if (!response.ok) {
                    throw new Error('Failed to fetch videos');
                }
                const data = await response.json();
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
        try {
            const response = await fetch('/api/videos');
            if (response.ok) {
                const data = await response.json();
                setVideos(data.videos);
            }
        } catch (err) {
            console.error('[VideoGrid] Failed to refresh videos:', err);
        }
    };

    const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete video');
            }
            await response.json();
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

    const activeVideos = videos.filter(video => !isVideoSubmitted(video));
    const assignedVideos = activeVideos.filter(video => video.assignments && video.assignments.length > 0);
    const unassignedVideos = activeVideos.filter(video => !video.assignments || video.assignments.length === 0);

    // ── ADDED: helpers for assignee facet ────────────────────────────────────
    const displayName = (a?: Video['assignments']) => {
        const u = a?.[0]?.user;
        return u ? (u.username || u.email.split('@')[0]) : null;
    };
    // Unique assignee names present in the active assigned videos
    const assigneeOptions = Array.from(
        new Set(assignedVideos.map(v => displayName(v.assignments)).filter(Boolean) as string[])
    ).sort();

    // ── ADDED: apply status + assignee filters to the center cards ───────────
    // The center grid shows ALL active videos (assigned and unassigned), so the
    // All / Unassigned / In Progress segments are meaningful (matches prototype).
    const filteredVideos = activeVideos.filter(v => {
        const isAssigned = !!(v.assignments && v.assignments.length > 0);
        if (statusFilter === 'Unassigned' && isAssigned) return false;
        if (statusFilter === 'In Progress' && !isAssigned) return false;
        if (assigneeFilter && displayName(v.assignments) !== assigneeFilter) return false;
        return true;
    });

    // ── ADDED: group the queue by matchup (event) ────────────────────────────
    const queueGroupsObj = unassignedVideos.reduce((acc, v) => {
        const key = `${v.boxer1} vs ${v.boxer2}`;
        (acc[key] = acc[key] || []).push(v);
        return acc;
    }, {} as Record<string, Video[]>);
    // sort rounds within each event, ascending
    Object.values(queueGroupsObj).forEach(list => list.sort((a, b) => a.round - b.round));
    const queueGroups = Object.entries(queueGroupsObj);

    // ── Single queue-card renderer reused by BOTH grouped and flat modes ──────
    // (This is the original per-video row markup, extracted verbatim so the
    //  assign button, delete menu and thumbnail behavior are unchanged.)
    const renderQueueCard = (video: Video) => (
        <div key={video.id} className="relative">
            <Link
                href={`/workspace?videoId=${video.id}`}
                className="block bg-surface border border-border rounded-xl p-3 hover:border-foreground-secondary/50 transition-colors cursor-pointer group/card"
            >
                <div className="flex items-start gap-3">
                    <div className="w-24 h-16 rounded-lg bg-black overflow-hidden shrink-0 relative border border-white/10">
                        {video.sourceUrls?.[0] ? (
                            <video
                                src={video.sourceUrls[0]}
                                className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity"
                                muted
                                playsInline
                                onMouseOver={e => e.currentTarget.play()}
                                onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-foreground-secondary">
                                <span className="text-xs">No Video</span>
                            </div>
                        )}
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

            {/* Assign Button — only round-assigners */}
            {canAssignRounds(currentUser?.email) && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedVideoForAssign({ id: video.id, title: video.title });
                        setAssignModalOpen(true);
                    }}
                    className="absolute top-2 right-10 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary/90 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all z-10 cursor-pointer"
                >
                    <UserPlus size={12} />
                    ASSIGN
                </button>
            )}

            {/* 3-Dot Menu — Delete Video (admins) */}
            {currentUser?.accountType === 'ADMIN' && (
                <div className="absolute top-2 right-2 z-20">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === video.id ? null : video.id);
                        }}
                        className="w-7 h-7 bg-surface/90 hover:bg-surface border border-border hover:border-foreground-secondary/50 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm cursor-pointer"
                    >
                        <MoreVertical size={14} className="text-foreground-secondary" />
                    </button>
                    {openDropdownId === video.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeleteConfirmId(video.id);
                                    setOpenDropdownId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Trash2 size={14} />
                                Delete Video
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full max-w-6xl mx-auto">
            {loading && (
                /* Skeleton mirrors the real two-column layout so content doesn't jump in */
                <div className="flex flex-col lg:flex-row gap-8 animate-pulse" aria-busy="true" aria-label="Loading projects">
                    {/* Left column: heading + filter bar + two-up card grid */}
                    <div className="flex-1 min-w-0">
                        <div className="h-8 w-48 bg-white/5 rounded-lg mb-6" />
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-8 w-64 max-w-full bg-white/5 rounded-[10px]" />
                            <div className="h-8 w-28 bg-white/5 rounded-[10px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 lg:gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-surface rounded-xl overflow-hidden border border-border flex flex-col">
                                    <div className="aspect-[4/3] bg-white/5" />
                                    <div className="px-3 pb-3 pt-2 lg:px-5 lg:pb-5 space-y-2.5 flex-1">
                                        <div className="h-4 w-3/4 bg-white/5 rounded" />
                                        <div className="h-3 w-1/2 bg-white/5 rounded" />
                                        <div className="h-5 w-24 bg-white/5 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Right rail: upload button + queue cards */}
                    <div className="w-full lg:w-80 shrink-0 space-y-6">
                        <div className="h-[74px] bg-white/5 rounded-2xl" />
                        <div className="space-y-4">
                            <div className="h-6 w-28 bg-white/5 rounded" />
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-[88px] bg-surface border border-border rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="text-center py-12">
                    <p className="text-red-500">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Explore Projects */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-medium text-foreground tracking-tight">Explore Projects</h2>
                        </div>

                        {/* ── ADDED: filter bar ──────────────────────────────── */}
                        <div className="flex items-center gap-3 mb-6 flex-wrap">
                            <SlidersHorizontal size={15} className="text-foreground-tertiary" />

                            {/* Status segments — All / Unassigned / In Progress */}
                            <div className="flex gap-0.5 bg-surface border border-border rounded-[10px] p-[3px]">
                                {(['All', 'Unassigned', 'In Progress'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={`px-3.5 py-1.5 text-xs font-medium rounded-[7px] transition-colors cursor-pointer ${statusFilter === s ? 'bg-surface-hover text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {/* Assignee facet — the "who" filter */}
                            <div className="relative">
                                <button
                                    onClick={() => setAssigneeMenuOpen(o => !o)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${assigneeFilter ? 'border-accent-primary text-foreground bg-surface' : 'border-border text-foreground-secondary bg-surface hover:bg-surface-hover'}`}
                                >
                                    <span className="text-foreground-tertiary font-normal">Assignee:</span>
                                    {assigneeFilter || 'Anyone'}
                                    <ChevronDown size={14} className="text-foreground-tertiary" />
                                </button>
                                {assigneeMenuOpen && (
                                    <div className="absolute top-[calc(100%+6px)] left-0 min-w-[170px] bg-surface border border-border rounded-lg p-1.5 z-50 shadow-xl">
                                        {['Anyone', ...assigneeOptions].map(name => {
                                            const active = (assigneeFilter || 'Anyone') === name;
                                            return (
                                                <button
                                                    key={name}
                                                    onClick={() => { setAssigneeFilter(name === 'Anyone' ? null : name); setAssigneeMenuOpen(false); }}
                                                    className={`block w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors ${active ? 'bg-accent-primary/10 text-accent-primary' : 'text-foreground hover:bg-surface-hover'}`}
                                                >
                                                    {name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <span className="ml-auto text-sm text-foreground-tertiary">
                                {filteredVideos.length} {filteredVideos.length === 1 ? 'project' : 'projects'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 lg:gap-6">
                            {filteredVideos.map((video) => (
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
                                        setSelectedVideoForAssign({ id: video.id, title: video.title, currentAssigneeUserId });
                                        setAssignModalOpen(true);
                                    }}
                                />
                            ))}
                        </div>

                        {filteredVideos.length === 0 && (
                            <div className="py-12 text-center text-foreground-tertiary text-sm">
                                No projects match these filters.
                            </div>
                        )}
                    </div>

                    {/* Right Column: In Queue (Unassigned) */}
                    <div className="w-full lg:w-80 shrink-0 space-y-6">
                        {/* Upload Video Indicator — UNCHANGED */}
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
                                {/* ── ADDED: group-by-event toggle ── */}
                                {unassignedVideos.length > 0 && (
                                    <button
                                        onClick={() => setGroupQueue(g => !g)}
                                        title={groupQueue ? 'Switch to flat list' : 'Group by event'}
                                        className={`ml-auto flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${groupQueue ? 'border-accent-primary/40 text-accent-primary bg-accent-primary/5' : 'border-border text-foreground-tertiary hover:bg-surface-hover'}`}
                                    >
                                        <Layers size={13} />
                                        {groupQueue ? `${queueGroups.length} events` : 'Group'}
                                    </button>
                                )}
                            </div>

                            {unassignedVideos.length === 0 ? (
                                <div className="border border-dashed border-border rounded-xl p-6 text-center">
                                    <p className="text-sm text-foreground-secondary">No videos waiting for assignment</p>
                                </div>
                            ) : groupQueue ? (
                                /* ── ADDED: grouped-by-event view ── */
                                <div className="space-y-2.5">
                                    {queueGroups.map(([event, list]) => {
                                        const collapsed = !expandedGroups[event];
                                        return (
                                            <div key={event} className="bg-surface/50 border border-border rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedGroups(s => ({ ...s, [event]: !s[event] }))}
                                                    className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-surface-hover/40 transition-colors cursor-pointer"
                                                >
                                                    <span className="text-foreground-tertiary">
                                                        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-foreground truncate">{event}</div>
                                                        <div className="text-[10.5px] text-foreground-tertiary mt-0.5">{list.length} rounds awaiting pickup</div>
                                                    </div>
                                                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                                                        {list.length}
                                                    </span>
                                                </button>

                                                {collapsed ? (
                                                    /* collapsed: round chips preview */
                                                    <div className="flex flex-wrap gap-1.5 px-3 pb-3 pl-[38px]">
                                                        {list.map(v => (
                                                            <span key={v.id} className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white/5 text-foreground-secondary border border-white/10">
                                                                R{v.round}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    /* expanded: full per-round cards + assign-all */
                                                    <div className="px-2.5 pb-2.5 space-y-2.5">
                                                        {list.map(renderQueueCard)}
                                                        {canAssignRounds(currentUser?.email) && list.length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    // Opens the assignment modal for the first round of the event.
                                                                    // TODO(impl): if your AssignmentModal supports batch assignment,
                                                                    // pass all round ids here instead of just the first.
                                                                    setSelectedVideoForAssign({ id: list[0].id, title: event });
                                                                    setAssignModalOpen(true);
                                                                }}
                                                                className="w-full py-2 text-[11px] font-bold rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                                            >
                                                                <UserPlus size={13} />
                                                                Assign all {list.length} rounds
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* ── flat view (original look) ── */
                                <div className="space-y-4">
                                    {unassignedVideos.map(renderQueueCard)}
                                </div>
                            )}

                            <p className="text-xs text-foreground-secondary mt-4 text-center">
                                Videos waiting to be picked up by team members
                            </p>
                        </div>

                        {/* Anonymous feedback widget fills the rail whitespace */}
                        <FeedbackWidget />
                    </div>
                </div>
            )}

            {/* Assignment Modal — UNCHANGED */}
            {selectedVideoForAssign && (
                <AssignmentModal
                    isOpen={assignModalOpen}
                    onClose={() => { setAssignModalOpen(false); setSelectedVideoForAssign(null); }}
                    videoId={selectedVideoForAssign.id}
                    videoTitle={selectedVideoForAssign.title}
                    currentAssigneeId={selectedVideoForAssign.currentAssigneeUserId}
                    onAssignmentSuccess={handleRefreshVideos}
                />
            )}

            {/* Delete Confirmation Dialog — UNCHANGED */}
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
                                    if (video) handleDeleteVideo(video.id, video.title);
                                }}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleting ? (
                                    <><Loader2 size={14} className="animate-spin" />Deleting...</>
                                ) : (
                                    <><Trash2 size={14} />Delete</>
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
