import React from 'react';
import { Play, MoreVertical, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface VideoCardProps {
    title: string;
    thumbnail?: string;
    progress: number;
    totalEvents: number;
    status: 'in_progress' | 'completed' | 'new';
    lastWorked?: string;
}

const VideoCard = ({ title, progress, totalEvents, status, lastWorked }: VideoCardProps) => {
    const percent = Math.round((progress / totalEvents) * 100);

    return (
        <Link href="/workspace">
            <div className="group bg-surface hover:bg-surface-hover rounded-xl overflow-hidden border border-transparent hover:border-border transition-all duration-300 cursor-pointer flex flex-col h-full">
                {/* Thumbnail Area */}
                <div className="relative aspect-[4/3] bg-black/40 overflow-hidden p-4">
                    {/* Grid of "thumbnails" to mimic the reference image style, or just one main one */}
                    <div className="w-full h-full rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 group-hover:scale-105 transition-transform duration-500" />

                        {/* Status Badge */}
                        <div className="absolute top-2 left-2 z-10">
                            {status === 'completed' && (
                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded border border-green-500/20">
                                    Done
                                </span>
                            )}
                            {status === 'in_progress' && (
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-500/20">
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-5 pb-5 pt-2 flex flex-col flex-1">
                    <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-accent-primary transition-colors line-clamp-1">
                        {title}
                    </h3>

                    <p className="text-sm text-foreground-secondary mb-4 line-clamp-2">
                        {status === 'new' ? 'Ready to start labeling' : `${progress} events logged • ${lastWorked}`}
                    </p>

                    <div className="mt-auto">
                        {status !== 'new' && (
                            <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
                                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${status === 'completed' ? 'bg-accent-success' : 'bg-accent-primary'}`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <span>{percent}%</span>
                            </div>
                        )}
                        {status === 'new' && (
                            <span className="text-xs text-foreground-tertiary">0 items</span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default VideoCard;
