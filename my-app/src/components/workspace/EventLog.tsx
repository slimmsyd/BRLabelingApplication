import React from 'react';
import { Trash2, Clock } from 'lucide-react';

export interface EventData {
    id: string;
    details: string;
    startTime: string;
    endTime: string;
    boxer: string;
    punchType: string;
    hand: string;
    target: string;
    visibilityFlags: string[];
    knockdown: boolean;
    punchQuality: string;
    cam?: string;
    stance?: string;
}

interface EventLogProps {
    events: EventData[];
    onStartPunch: () => void;
    onEndPunch: () => void;
    onDeleteEvent: (index: number) => void;
    readOnly?: boolean;
    onSeek?: (event: EventData) => void;
    onSelectEvent?: (event: EventData) => void;
}

const EventLog = ({ events, onStartPunch, onEndPunch, onDeleteEvent, readOnly = false, onSeek, onSelectEvent }: EventLogProps) => {
    const boxerAEvents = events.filter(e => e.boxer === 'Boxer A');
    const boxerBEvents = events.filter(e => e.boxer === 'Boxer B');

    const EventRow = ({ event, index }: { event: EventData, index: number }) => (
        <div
            onClick={() => !readOnly && onSelectEvent?.(event)}
            className={`group hover:bg-white/5 transition-colors p-3 flex items-start gap-4 ${!readOnly ? 'cursor-pointer' : ''}`}
        >
            {/* Left: Context & Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="font-bold text-foreground text-sm">{event.punchType}</span>
                    <span className="text-foreground-secondary text-xs">•</span>
                    <span className="text-foreground-secondary text-sm">{event.target}</span>
                </div>

                {/* Visibility Flags */}
                {event.visibilityFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {event.visibilityFlags.map((flag, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-foreground-secondary border border-white/10">
                                {flag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Quality Badge */}
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${event.punchQuality === '5' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30' :
                        event.punchQuality === '4' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            'bg-white/5 text-foreground-secondary border border-white/10'
                        }`}>
                        Q{event.punchQuality}
                    </span>
                    {event.knockdown && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 uppercase tracking-wider">
                            Knockdown
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Timestamps & Actions */}
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onSeek?.(event)}
                        className="font-mono text-xs text-accent-primary hover:underline cursor-pointer bg-accent-primary/10 px-1.5 py-0.5 rounded"
                    >
                        {event.startTime}
                    </button>
                    <span className="text-foreground-secondary text-[10px]">-</span>
                    <span className="font-mono text-xs text-foreground-secondary">
                        {event.endTime || '...'}
                    </span>
                </div>

                {!readOnly && (
                    <button
                        onClick={() => onDeleteEvent(index)}
                        className="p-1.5 text-foreground-secondary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Event"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );

    const EventTable = ({ title, data }: { title: string, data: EventData[] }) => (
        <div className="flex-1 min-w-0 bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-[400px]">
            <div className="p-3 border-b border-border bg-white/5">
                <h3 className="font-medium text-foreground text-sm">{title}</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-foreground-secondary space-y-2 opacity-50">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <span className="text-lg">?</span>
                        </div>
                        <p className="text-xs">No events logged</p>
                    </div>
                ) : (
                    data.map((event, index) => (
                        <EventRow key={event.id || index} event={event} index={index} />
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Quick Actions */}
            {!readOnly && (
                <div className="flex gap-2">
                    <button
                        onClick={onStartPunch}
                        className="flex-1 py-2 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/30 text-accent-primary rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Clock size={14} />
                        Mark Start
                    </button>
                    <button
                        onClick={onEndPunch}
                        className="flex-1 py-2 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/30 text-accent-primary rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Clock size={14} />
                        Mark End
                    </button>
                </div>
            )}

            {/* Split View Tables */}
            <div className="flex gap-4">
                <EventTable title="Boxer A (Fury)" data={boxerAEvents} />
                <EventTable title="Boxer B (Usyk)" data={boxerBEvents} />
            </div>
        </div>
    );
};

export default EventLog;
