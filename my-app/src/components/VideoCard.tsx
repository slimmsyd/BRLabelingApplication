import React, { useState } from 'react';
import { Play, MoreVertical, Clock, CheckCircle2, Video as VideoIcon, UserPlus, UserMinus } from 'lucide-react';
import Link from 'next/link';

interface VideoCardProps {
    id: string;
    title: string;
    boxer1: string;
    boxer2: string;
    round: number;
    fightDate: string;
    numCameraViews: number;
    createdAt: string;
    archived?: boolean;
    onArchivedClick?: (title: string) => void;
    assignee?: {
        username: string | null;
        email: string;
        status: string;
    };
    thumbnailUrl?: string;
    canAssign?: boolean;
    assignmentId?: string;
    onAssignmentChange?: () => void;
    onAssignClick?: () => void;
}

const VideoCard = ({ id, title, boxer1, boxer2, round, fightDate, numCameraViews, createdAt, archived = false, onArchivedClick, assignee, thumbnailUrl, canAssign = false, assignmentId, onAssignmentChange, onAssignClick }: VideoCardProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const [removing, setRemoving] = useState(false);

    const formattedDate = new Date(fightDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const uploadDate = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const handleRemoveAssignment = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!assignmentId || !confirm('Are you sure you want to remove this assignment?')) return;
        setRemoving(true);
        try {
            const response = await fetch(`/api/videos/${id}/unassign`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentId }),
            });
            if (response.ok) {
                onAssignmentChange?.();
            } else {
                alert('Failed to remove assignment');
            }
        } catch (err) {
            console.error('Error removing assignment:', err);
            alert('Error removing assignment');
        } finally {
            setRemoving(false);
            setShowMenu(false);
        }
    };

    // ── ADDED: shared status label + color, so de-duped footer matches old colors ──
    const statusLabel = assignee?.status === 'ASSIGNED' ? 'IN PROGRESS' : assignee?.status;
    const statusClasses = assignee?.status === 'SUBMITTED'
        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
        : assignee?.status === 'COMPLETED'
            ? 'bg-green-500/10 text-green-500 border-green-500/20'
            : 'bg-blue-500/10 text-blue-500 border-blue-500/20';

    const cardInner = (
            <div className="group bg-surface hover:bg-surface-hover rounded-xl overflow-hidden border border-transparent hover:border-border transition-all duration-300 cursor-pointer flex flex-col h-full relative">

                <div className="relative aspect-[4/3] bg-black/40 overflow-hidden p-2 lg:p-4">
                    <div className="w-full h-full rounded-lg overflow-hidden relative">
                        {thumbnailUrl ? (
                            <video
                                src={thumbnailUrl}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                muted
                                playsInline
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 group-hover:scale-105 transition-transform duration-500" />
                        )}

                        {/* Assignment Menu - Top Left (only for round-assigners) */}
                        {canAssign && (
                            <div className="absolute top-2 left-2 z-20">
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
                                    className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-black/80 flex items-center justify-center transition-all"
                                >
                                    <MoreVertical size={16} className="text-white" />
                                </button>
                                {showMenu && (
                                    <div className="absolute top-10 left-0 w-48 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-30">
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); onAssignClick?.(); }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-accent-primary hover:bg-accent-primary/10 flex items-center gap-2 transition-colors border-b border-border"
                                        >
                                            <UserPlus size={14} />
                                            {assignee ? 'Reassign Video' : 'Assign to User'}
                                        </button>
                                        {assignee && assignmentId && (
                                            <button
                                                onClick={handleRemoveAssignment}
                                                disabled={removing}
                                                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors disabled:opacity-50"
                                            >
                                                <UserMinus size={14} />
                                                {removing ? 'Removing...' : 'Remove Assignment'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Camera Count Badge */}
                        <div className="absolute top-2 left-2 z-10">
                            <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-wider rounded border border-accent-primary/30 flex items-center gap-1">
                                <VideoIcon size={10} />
                                {numCameraViews} {numCameraViews === 1 ? 'Cam' : 'Cams'}
                            </span>
                        </div>

                        {/* Round Badge */}
                        <div className="absolute top-2 right-2 z-10">
                            <span className="px-2 py-1 bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/20">
                                R{round}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-3 pb-3 pt-2 lg:px-5 lg:pb-5 flex flex-col flex-1">
                    {/* CHANGED: title only — the redundant "{boxer1} vs {boxer2}" subtitle is removed,
                        because the title already reads e.g. "Isaac Cruz v Giovanni Cabrera - R11". */}
                    <h3 className="font-semibold text-foreground text-sm lg:text-base mb-1 group-hover:text-accent-primary transition-colors line-clamp-2 lg:line-clamp-1">
                        {title}
                    </h3>

                    <div className="mt-auto space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs text-foreground-tertiary">{formattedDate}</p>
                            <p className="text-xs text-foreground-tertiary">Uploaded {uploadDate}</p>
                        </div>

                        {/* CHANGED: de-duplicated assignment footer.
                            Was: a white "ASSIGNED: name" pill stacked above a separate status pill.
                            Now: ONE inline row — name (with green dot) + status pill together. */}
                        <div>
                            {assignee ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-secondary">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        {assignee.username || assignee.email.split('@')[0]}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${statusClasses}`}>
                                        {statusLabel}
                                    </span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center bg-white/5 border border-white/10 text-foreground-secondary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                    UNASSIGNED
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
    );

    if (archived) {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={() => onArchivedClick?.(title)}
                onKeyDown={(e) => e.key === 'Enter' && onArchivedClick?.(title)}
            >
                {cardInner}
            </div>
        );
    }

    return (
        <Link href={`/workspace?videoId=${id}`}>
            {cardInner}
        </Link>
    );
};

export default VideoCard;
