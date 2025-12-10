import React from 'react';
import { Play, MoreVertical, Clock, CheckCircle2, Video as VideoIcon } from 'lucide-react';
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
    assignee?: {
        username: string | null;
        email: string;
        status: string;
    };
    thumbnailUrl?: string;
}

const VideoCard = ({ id, title, boxer1, boxer2, round, fightDate, numCameraViews, createdAt, assignee, thumbnailUrl }: VideoCardProps) => {
    // Format the fight date
    const formattedDate = new Date(fightDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Format the upload date
    const uploadDate = new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

    return (
        <Link href={`/workspace?videoId=${id}`}>
            <div className="group bg-surface hover:bg-surface-hover rounded-xl overflow-hidden border border-transparent hover:border-border transition-all duration-300 cursor-pointer flex flex-col h-full relative">

                <div className="relative aspect-[4/3] bg-black/40 overflow-hidden p-4">
                    <div className="w-full h-full rounded-lg overflow-hidden relative">
                        {thumbnailUrl ? (
                            <video
                                src={thumbnailUrl}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                muted
                                playsInline
                            // onMouseOver={(e) => e.currentTarget.play()}
                            // onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 group-hover:scale-105 transition-transform duration-500" />
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
                <div className="px-5 pb-5 pt-2 flex flex-col flex-1">
                    <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-accent-primary transition-colors line-clamp-1">
                        {title}
                    </h3>

                    <p className="text-sm text-foreground-secondary mb-2">
                        {boxer1} vs {boxer2}
                    </p>

                    <div className="mt-auto space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs text-foreground-tertiary">
                                {formattedDate}
                            </p>
                            <p className="text-xs text-foreground-tertiary">
                                Uploaded {uploadDate}
                            </p>
                        </div>

                        {/* Assignment Status */}
                        <div>
                            {assignee ? (
                                <div className="space-y-1.5">
                                    <div className="inline-flex items-center gap-1.5 bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        ASSIGNED: {assignee.username || assignee.email.split('@')[0]}
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${assignee.status === 'SUBMITTED'
                                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        : assignee.status === 'COMPLETED'
                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        }`}>
                                        {assignee.status === 'ASSIGNED' ? 'IN PROGRESS' : assignee.status}
                                    </div>
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
        </Link>
    );
};

export default VideoCard;
