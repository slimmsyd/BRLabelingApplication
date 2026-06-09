import React from 'react';
import { Settings, Search, ChevronDown, Video, Box, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

interface Assignment {
    id: string;
    video: {
        id: string;
        title: string;
        boxer1: string;
        boxer2: string;
        round: number;
    };
    status: string;
    updatedAt: string;
    username?: string;
}

interface SidebarProps {
    isOpen: boolean;
    toggle: () => void;
}

const Sidebar = ({ isOpen, toggle }: SidebarProps) => {

    const { user } = useCurrentUser();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submittedVideos, setSubmittedVideos] = useState<Assignment[]>([]);
    const [submittedCounts, setSubmittedCounts] = useState<{ awaiting: number; complete: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [submittedLoading, setSubmittedLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
    const [isResizing, setIsResizing] = useState(false);

    // Assignments (active work) — depends on the user id, so re-runs once the
    // shared user resolves.
    useEffect(() => {
        if (!user?.userId) return;
        let cancelled = false;
        const fetchAssignments = async () => {
            setLoading(true);
            try {
                const assignRes = await fetch(`/api/videos/assigned?userId=${user.userId}`);
                if (assignRes.ok && !cancelled) {
                    const assignData = await assignRes.json();
                    setAssignments(assignData.assignments);
                }
            } catch (error) {
                console.error('Sidebar assignments fetch error:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchAssignments();
        return () => { cancelled = true; };
    }, [user?.userId]);

    // Submitted videos (public) — independent of the user, fetch on mount.
    useEffect(() => {
        let cancelled = false;
        const fetchSubmitted = async () => {
            setSubmittedLoading(true);
            try {
                const submittedRes = await fetch('/api/videos/submitted');
                if (submittedRes.ok && !cancelled) {
                    const submittedData = await submittedRes.json();
                    setSubmittedVideos(submittedData.assignments);
                    if (submittedData.counts) setSubmittedCounts(submittedData.counts);
                }
            } catch (error) {
                console.error('Sidebar submitted fetch error:', error);
            } finally {
                if (!cancelled) setSubmittedLoading(false);
            }
        };
        fetchSubmitted();
        return () => { cancelled = true; };
    }, []);

    // Handle sidebar resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 500) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);
    return (
        <>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.25);
                }
                .resize-handle {
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    cursor: ew-resize;
                    background: transparent;
                    transition: background 0.2s;
                }
                .resize-handle:hover {
                    background: rgba(99, 102, 241, 0.3);
                }
            `}</style>
            <aside
                style={{ width: isOpen ? `${sidebarWidth}px` : '80px' }}
                className={`h-screen bg-sidebar-bg border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out ${isResizing ? 'select-none' : ''}`}
            >
                {/* Header / Logo Area */}
                <div className={`h-16 flex items-center px-4 gap-3 ${!isOpen && 'justify-center'}`}>
                    <button
                        onClick={toggle}
                        className="p-2 hover:bg-white/5 rounded-md transition-colors text-foreground-secondary hover:text-foreground cursor-pointer"
                    >
                        <div className="space-y-1">
                            <div className="w-4 h-0.5 bg-current"></div>
                            <div className="w-4 h-0.5 bg-current"></div>
                            <div className="w-4 h-0.5 bg-current"></div>
                        </div>
                    </button>

                    <div className={`flex-1 relative transition-opacity duration-200 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                        <div className="flex items-center gap-2 bg-surface hover:bg-surface-hover transition-colors px-3 py-1.5 rounded-full border border-border group">
                            <Search size={14} className="text-foreground-secondary group-hover:text-foreground transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search projects..."
                                className="bg-transparent text-sm text-foreground placeholder:text-foreground-secondary outline-none w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Navigation
                    CHANGED: nav is now a flex column that owns the full remaining height.
                    `min-h-0` lets children shrink so their inner lists can scroll.
                    The nav itself no longer scrolls — each list scrolls inside its own region. */}
                <nav className="flex-1 min-h-0 px-4 py-6 flex flex-col gap-6 overflow-x-hidden">

                    {/* Assigned to You */}
                    {(() => {
                        const filteredAssignments = assignments.filter((a) => {
                            if (!searchQuery.trim()) return true;
                            const query = searchQuery.toLowerCase();
                            const title = a.video.title.toLowerCase();
                            const boxer1 = a.video.boxer1.toLowerCase();
                            const boxer2 = a.video.boxer2.toLowerCase();
                            const round = a.video.round.toString();
                            return title.includes(query) || boxer1.includes(query) || boxer2.includes(query) || round.includes(query);
                        });

                        return (
                            <div className="space-y-2 shrink-0">
                                <div className={`px-2 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider transition-opacity duration-200 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                    Assigned to You
                                </div>
                                <div className="space-y-0.5">
                                    {loading ? (
                                        <div className="px-3 py-2 text-foreground-secondary text-sm flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className={`${!isOpen && 'hidden'}`}>Loading...</span>
                                        </div>
                                    ) : filteredAssignments.length > 0 ? (
                                        filteredAssignments.map((assignment) => (
                                            <Link
                                                key={assignment.id}
                                                href={`/workspace?videoId=${assignment.video.id}`}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-white/5 transition-colors cursor-pointer ${!isOpen && 'justify-center px-0'}`}
                                            >
                                                <Video size={16} className="text-accent-primary shrink-0" />
                                                <span className={`transition-opacity duration-200 whitespace-nowrap truncate ${!isOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                                                    {assignment.video.title}
                                                </span>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className={`text-xs text-foreground-secondary px-3 py-2 italic ${!isOpen && 'hidden'}`}>
                                            {searchQuery.trim() ? 'No matching assignments' : 'No active assignments'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Awaiting QC - Videos that need quality control review */}
                    {(() => {
                        const awaitingQC = submittedVideos.filter(a => a.status === 'SUBMITTED');
                        const filteredAwaitingQC = awaitingQC.filter((a) => {
                            if (!searchQuery.trim()) return true;
                            const query = searchQuery.toLowerCase();
                            const title = a.video.title.toLowerCase();
                            const boxer1 = a.video.boxer1.toLowerCase();
                            const boxer2 = a.video.boxer2.toLowerCase();
                            const round = a.video.round.toString();
                            const username = (a.username || '').toLowerCase();
                            return title.includes(query) || boxer1.includes(query) || boxer2.includes(query) || round.includes(query) || username.includes(query);
                        });

                        return (
                            <div className={`space-y-2 ${isOpen ? 'flex-1 min-h-0 flex flex-col pt-6 border-t border-border' : ''}`}>
                                <div className={`px-2 flex items-center gap-2 transition-opacity duration-200 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                    <span className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                                        Awaiting QC
                                    </span>
                                    {filteredAwaitingQC.length > 0 && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                                            {searchQuery.trim() ? filteredAwaitingQC.length : (submittedCounts?.awaiting ?? filteredAwaitingQC.length)}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                    {submittedLoading ? (
                                        <div className="px-3 py-2 text-foreground-secondary text-sm flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className={`${!isOpen && 'hidden'}`}>Loading...</span>
                                        </div>
                                    ) : filteredAwaitingQC.length > 0 ? (
                                        filteredAwaitingQC.map((assignment) => (
                                            <Link
                                                key={assignment.id}
                                                href={`/workspace?videoId=${assignment.video.id}`}
                                                className={`w-full flex flex-col gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors cursor-pointer ${!isOpen && 'hidden'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Video size={14} className="text-amber-500 shrink-0" />
                                                    <span className="text-foreground truncate text-xs font-medium">
                                                        {assignment.video.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 pl-5 flex-wrap">
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                        NEEDS QC
                                                    </span>
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                        R{assignment.video.round}
                                                    </span>
                                                    {assignment.username && (
                                                        <span className="text-[9px] text-foreground-secondary truncate">
                                                            {assignment.username}
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] text-foreground-tertiary">
                                                        {new Date(assignment.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className={`text-xs text-foreground-secondary px-3 py-2 italic ${!isOpen && 'hidden'}`}>
                                            {searchQuery.trim() ? 'No matching videos' : 'No videos awaiting QC'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* QC Complete - Videos that have been reviewed */}
                    {(() => {
                        const qcComplete = submittedVideos.filter(a => a.status === 'REVIEWED' || a.status === 'COMPLETED');
                        const filteredQCComplete = qcComplete.filter((a) => {
                            if (!searchQuery.trim()) return true;
                            const query = searchQuery.toLowerCase();
                            const title = a.video.title.toLowerCase();
                            const boxer1 = a.video.boxer1.toLowerCase();
                            const boxer2 = a.video.boxer2.toLowerCase();
                            const round = a.video.round.toString();
                            const username = (a.username || '').toLowerCase();
                            return title.includes(query) || boxer1.includes(query) || boxer2.includes(query) || round.includes(query) || username.includes(query);
                        });

                        return (
                            <div className={`space-y-2 ${isOpen ? 'flex-1 min-h-0 flex flex-col pt-6 border-t border-border' : ''}`}>
                                <div className={`px-2 flex items-center gap-2 transition-opacity duration-200 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                    <span className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                                        QC Complete
                                    </span>
                                    {filteredQCComplete.length > 0 && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/10 text-green-500 rounded border border-green-500/20">
                                            {searchQuery.trim() ? filteredQCComplete.length : (submittedCounts?.complete ?? filteredQCComplete.length)}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                    {submittedLoading ? (
                                        <div className="px-3 py-2 text-foreground-secondary text-sm flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className={`${!isOpen && 'hidden'}`}>Loading...</span>
                                        </div>
                                    ) : filteredQCComplete.length > 0 ? (
                                        filteredQCComplete.map((assignment) => {
                                            const isCompleted = assignment.status === 'COMPLETED';
                                            return (
                                                <Link
                                                    key={assignment.id}
                                                    href={`/workspace?videoId=${assignment.video.id}`}
                                                    className={`w-full flex flex-col gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors cursor-pointer ${!isOpen && 'hidden'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Video size={14} className={isCompleted ? "text-green-500" : "text-purple-500"} />
                                                        <span className="text-foreground truncate text-xs font-medium">
                                                            {assignment.video.title}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-5 flex-wrap">
                                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${isCompleted
                                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                            }`}>
                                                            {isCompleted ? 'COMPLETED' : 'REVIEWED'}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                            R{assignment.video.round}
                                                        </span>
                                                        {assignment.username && (
                                                            <span className="text-[9px] text-foreground-secondary truncate">
                                                                {assignment.username}
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] text-foreground-tertiary">
                                                            {new Date(assignment.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })
                                    ) : (
                                        <div className={`text-xs text-foreground-secondary px-3 py-2 italic ${!isOpen && 'hidden'}`}>
                                            {searchQuery.trim() ? 'No matching videos' : 'No QC completed videos'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                </nav>

                {/* Footer Settings */}
                <div className="p-4 space-y-1 border-t border-transparent">
                    <Link
                        href="/settings"
                        className={`w-full flex items-center ${isOpen ? 'justify-between' : 'justify-center'} px-2 py-2 text-xs text-foreground-secondary hover:text-foreground transition-colors rounded-lg hover:bg-white/5 cursor-pointer`}
                    >
                        <span className={`transition-opacity duration-200 ${!isOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Settings</span>
                        <Settings size={14} className="shrink-0" />
                    </Link>

                    <div className={`pt-4 mt-2 border-t border-border/40 ${!isOpen && 'hidden'}`}>
                        <div className="w-full flex items-center justify-center px-2 py-1 text-xs text-foreground-tertiary font-medium tracking-wider uppercase whitespace-nowrap">
                            Box RAW Labs
                        </div>
                    </div>
                </div>

                {/* Resize Handle */}
                {isOpen && (
                    <div
                        className="resize-handle"
                        onMouseDown={() => setIsResizing(true)}
                    />
                )}
            </aside>
        </>
    );
};

export default Sidebar;
