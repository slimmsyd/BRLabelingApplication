import React from 'react';
import { Trash2, Plus } from 'lucide-react';

export interface EventData {
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
}

interface EventLogProps {
    events: EventData[];
    onStartPunch: () => void;
    onEndPunch: () => void;
    onDeleteEvent: (index: number) => void;
}

const EventLog = ({ events, onStartPunch, onEndPunch, onDeleteEvent }: EventLogProps) => {
    const boxerAEvents = events.filter(e => e.boxer === 'Boxer A');
    const boxerBEvents = events.filter(e => e.boxer === 'Boxer B');

    const EventTable = ({ title, data, startIndex }: { title: string, data: EventData[], startIndex: number }) => (
        <div className="border border-border rounded-lg overflow-hidden flex flex-col h-full bg-surface">
            <div className="bg-background px-4 py-3 border-b border-border font-medium text-foreground flex justify-between items-center">
                <span>{title}</span>
                <span className="text-xs text-foreground-secondary font-normal">{data.length} events</span>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
                {data.length === 0 ? (
                    <div className="px-4 py-12 text-center text-foreground-secondary text-sm">
                        No events logged yet.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {data.map((event, i) => (
                            <div key={i} className="group hover:bg-white/5 transition-colors p-3 flex items-start gap-4">
                                {/* Left: Context & Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-1.5">
                                        <span className="font-bold text-foreground text-sm">{event.punchType}</span>
                                        <span className="text-foreground-secondary text-xs">•</span>
                                        <span className="text-foreground-secondary text-sm">{event.target}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Hand Badge */}
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${event.hand === 'Left'
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                            {event.hand === 'Left' ? 'L' : 'R'}
                                        </span>

                                        {/* Cam Badge */}
                                        {event.cam && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-foreground-secondary border border-white/10">
                                                {event.cam}
                                            </span>
                                        )}

                                        {/* Visibility Flags */}
                                        {event.visibilityFlags.map(flag => (
                                            <span key={flag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                                                {flag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Timing & Actions */}
                                <div className="flex items-start gap-4">
                                    <div className="text-right flex flex-col">
                                        <span className="font-mono text-xs text-foreground">{event.startTime}</span>
                                        <span className="font-mono text-[10px] text-foreground-secondary">{event.endTime}</span>
                                    </div>

                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onDeleteEvent(startIndex + i)}
                                            className="p-1 text-foreground-secondary hover:text-red-400 transition-colors"
                                            title="Delete event"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-surface rounded-xl border border-border p-6">

            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-background border border-border px-3 py-1.5 rounded text-mono text-sm font-medium text-foreground">
                        Time: 00:00:05.54
                    </div>
                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-border rounded text-xs font-medium text-foreground transition-colors">
                            Zoom
                        </button>
                        <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-border rounded text-xs font-medium text-foreground transition-colors">
                            Faint
                        </button>
                        <button
                            onClick={onStartPunch}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-border rounded text-xs font-medium text-foreground transition-colors"
                        >
                            Start Punch
                        </button>
                        <button
                            onClick={onEndPunch}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-border rounded text-xs font-medium text-foreground transition-colors"
                        >
                            End Punch
                        </button>
                    </div>
                </div>


            </div>

            {/* Data Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EventTable title="Boxer A" data={boxerAEvents} startIndex={0} />
                <EventTable title="Boxer B" data={boxerBEvents} startIndex={events.findIndex(e => e.boxer === 'Boxer B')} />
            </div>
        </div>
    );
};

export default EventLog;
