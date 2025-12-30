import React from 'react';
import { Settings, Search, ChevronDown, Video, Box, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
}

interface SidebarProps {
    isOpen: boolean;
    toggle: () => void;
}

const Sidebar = ({ isOpen, toggle }: SidebarProps) => {

    const [user, setUser] = useState<{ userId: string } | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submittedVideos, setSubmittedVideos] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [submittedLoading, setSubmittedLoading] = useState(false);

    useEffect(() => {
        const fetchUserAndAssignments = async () => {
            try {
                // 1. Fetch User
                const userRes = await fetch('/api/auth/me');
                if (!userRes.ok) return;
                const userData = await userRes.json();
                setUser(userData);

                // 2. Fetch Assignments (active work)
                if (userData.userId) {
                    setLoading(true);
                    const assignRes = await fetch(`/api/videos/assigned?userId=${userData.userId}`);
                    if (assignRes.ok) {
                        const assignData = await assignRes.json();
                        setAssignments(assignData.assignments);
                    }
                }

                // 3. Fetch Submitted Videos (all users - public)
                setSubmittedLoading(true);
                const submittedRes = await fetch('/api/videos/submitted');
                if (submittedRes.ok) {
                    const submittedData = await submittedRes.json();
                    setSubmittedVideos(submittedData.assignments);
                }
            } catch (error) {
                console.error('Sidebar data fetch error:', error);
            } finally {
                setLoading(false);
                setSubmittedLoading(false);
            }
        };

        fetchUserAndAssignments();
    }, []);
    return (
        <aside
            className={`${isOpen ? 'w-64' : 'w-20'} h-screen bg-sidebar-bg border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out`}
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
                    <div className="flex items-center gap-2 bg-surface hover:bg-surface-hover transition-colors px-3 py-1.5 rounded-full border border-border cursor-pointer group">
                        <Search size={14} className="text-foreground-secondary group-hover:text-foreground transition-colors" />
                        <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors whitespace-nowrap">Search projects...</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto overflow-x-hidden">

                {/* Assigned to You */}
                <div className="space-y-2">
                    <div className={`px-2 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider transition-opacity duration-200 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                        Assigned to You
                    </div>
                    <div className="space-y-0.5">
                        {loading ? (
                            <div className="px-3 py-2 text-foreground-secondary text-sm flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                <span className={`${!isOpen && 'hidden'}`}>Loading...</span>
                            </div>
                        ) : assignments.length > 0 ? (
                            assignments.map((assignment) => (
                                <Link
                                    key={assignment.id}
                                    href={`/workspace?videoId=${assignment.video.id}`}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-white/5 transition-colors cursor-pointer ${!isOpen && 'justify-center px-0'}`}
                                >
                                    <Video size={16} className="text-accent-primary shrink-0" />
                                    <span className={`transition-opacity duration-200 whitespace-nowrap truncate ${!isOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                                        {assignment.video.boxer1} vs {assignment.video.boxer2}
                                    </span>
                                </Link>
                            ))
                        ) : (
                            <div className={`text-xs text-foreground-secondary px-3 py-2 italic ${!isOpen && 'hidden'}`}>
                                No active assignments
                            </div>
                        )}
                    </div>
                </div>

                {/* Awaiting QC - Videos that need quality control review */}
                {(() => {
                    const awaitingQC = submittedVideos.filter(a => a.status === 'SUBMITTED');
                    return (
                        <div className="space-y-2">
                            <div className={`px-2 flex items-center gap-2 transition-opacity duration-200 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                <span className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                                    Awaiting QC
                                </span>
                                {awaitingQC.length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                                        {awaitingQC.length}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                {submittedLoading ? (
                                    <div className="px-3 py-2 text-foreground-secondary text-sm flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className={`${!isOpen && 'hidden'}`}>Loading...</span>
                                    </div>
                                ) : awaitingQC.length > 0 ? (
                                    awaitingQC.map((assignment) => (
                                        <Link
                                            key={assignment.id}
                                            href={`/workspace?videoId=${assignment.video.id}`}
                                            className={`w-full flex flex-col gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors cursor-pointer ${!isOpen && 'hidden'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Video size={14} className="text-amber-500 shrink-0" />
                                                <span className="text-foreground truncate text-xs font-medium">
                                                    {assignment.video.boxer1} vs {assignment.video.boxer2}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 pl-5">
                                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                    NEEDS QC
                                                </span>
                                                <span className="text-[9px] text-foreground-tertiary">
                                                    {new Date(assignment.updatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className={`text-xs text-foreground-secondary px-3 py-2 italic ${!isOpen && 'hidden'}`}>
                                        No videos awaiting QC
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* QC Complete - Videos that have been reviewed */}
                {(() => {
                    const qcComplete = submittedVideos.filter(a => a.status === 'REVIEWED' || a.status === 'COMPLETED');
                    return (
                        <div className="space-y-2">
                            <div className={`px-2 flex items-center gap-2 transition-opacity duration-200 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                                <span className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                                    QC Complete
                                </span>
                                {qcComplete.length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/10 text-green-500 rounded border border-green-500/20">
                                        {qcComplete.length}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                {submittedLoading ? (
                                    <div className="px-3 py-2 text-foreground-secondary text-sm flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className={`${!isOpen && 'hidden'}`}>Loading...</span>
                                    </div>
                                ) : qcComplete.length > 0 ? (
                                    qcComplete.map((assignment) => {
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
                                                        {assignment.video.boxer1} vs {assignment.video.boxer2}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 pl-5">
                                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${
                                                        isCompleted 
                                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                    }`}>
                                                        {isCompleted ? 'COMPLETED' : 'REVIEWED'}
                                                    </span>
                                                    <span className="text-[9px] text-foreground-tertiary">
                                                        {new Date(assignment.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className={`text-xs text-foreground-secondary px-3 py-2 italic ${!isOpen && 'hidden'}`}>
                                        No QC completed videos
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
        </aside>
    );
};

export default Sidebar;
