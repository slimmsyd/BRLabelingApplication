import React, { useState, useMemo } from 'react';
import { Trash2, Clock, ArrowUpDown } from 'lucide-react';

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
    landed?: boolean; // Deprecated in favor of punchResult, kept for compat
    punchResult?: string;
    defenseType?: string;
    // Track who labeled this event
    labeledBy?: string;
    labeledByEmail?: string;
    // Timestamps
    createdAt?: string;  // ISO timestamp when event was created
    updatedAt?: string;  // ISO timestamp when event was last updated
}

interface EventLogProps {
    events: EventData[];
    onStartPunch: () => void;
    onEndPunch: () => void;
    onDeleteEvent: (eventId: string) => void;
    readOnly?: boolean;
    onSeek?: (event: EventData) => void;
    onSeekEnd?: (event: EventData) => void;
    onSelectEvent?: (event: EventData) => void;
    boxerNames?: { boxerA: string; boxerB: string };
    selectedEventId?: string | null; // Currently editing event
}

// Helper function to parse time string to seconds for sorting
const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;

    const mins = parseInt(parts[0]) || 0;
    const rest = parts[1];
    if (!rest) return mins * 60;

    const secParts = rest.split('.');
    const secs = parseInt(secParts[0]) || 0;
    const ms = parseInt(secParts[1] || '0') || 0;

    return mins * 60 + secs + ms / 100;
};

// Sort events by start time - descending (latest in round at top) or ascending
const sortEventsByTimestamp = (eventList: EventData[], descending: boolean = true) => {
    return [...eventList].sort((a, b) => {
        const timeA = parseTimeToSeconds(a.startTime);
        const timeB = parseTimeToSeconds(b.startTime);
        return descending ? timeB - timeA : timeA - timeB;
    });
};

const EventRow = ({
    event,
    isLatest,
    isEditing,
    readOnly,
    onSelectEvent,
    onSeek,
    onSeekEnd,
    onDeleteEvent
}: {
    event: EventData,
    isLatest?: boolean,
    isEditing?: boolean,
    readOnly: boolean,
    onSelectEvent?: (event: EventData) => void,
    onSeek?: (event: EventData) => void,
    onSeekEnd?: (event: EventData) => void,
    onDeleteEvent: (eventId: string) => void
}) => (
    <div
        onClick={() => !readOnly && onSelectEvent?.(event)}
        className={`group relative transition-all duration-200 p-3 flex items-start gap-4 rounded-lg ${isEditing
            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/10'
            : isLatest
                ? 'bg-accent-primary/10 border border-accent-primary/30 ring-1 ring-accent-primary/20'
                : 'hover:bg-white/5 border border-transparent'
            } ${!readOnly ? 'cursor-pointer' : ''}`}
    >
        {/* Editing badge - takes priority over Latest */}
        {isEditing && (
            <div className="absolute -top-2 left-3 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full animate-pulse">
                Editing
            </div>
        )}
        {/* Latest badge - only show if not editing */}
        {isLatest && !isEditing && (
            <div className="absolute -top-2 left-3 px-2 py-0.5 bg-accent-primary text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
                Latest
            </div>
        )}
        {/* Left: Context & Details */}
        <div className="flex-1 min-w-0">
            {/* Punch Type & Target */}
            <div className="flex items-baseline gap-2 mb-2">
                <span className="font-bold text-foreground text-sm">{event.punchType}</span>
                <span className="text-foreground-secondary text-xs">•</span>
                <span className="text-foreground-secondary text-sm">{event.target}</span>
            </div>

            {/* Badges Row 1: Hand, CAM, Stance */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                {/* Hand Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${event.hand === 'Left'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {(() => {
                        const stance = event.stance || 'Orthodox';
                        const hand = event.hand;
                        if (stance === 'Orthodox') {
                            return hand === 'Left' ? 'Lead (L)' : 'Rear (R)';
                        } else {
                            return hand === 'Right' ? 'Lead (R)' : 'Rear (L)';
                        }
                    })()}
                </span>

                {/* CAM Badge */}
                {event.cam && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {event.cam}
                    </span>
                )}

                {/* Stance Badge */}
                {event.stance && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {event.stance}
                    </span>
                )}

                {/* Quality Badge - Only show if Landed */}
                {(event.punchResult === 'Landed' || (!event.punchResult && event.landed !== false)) && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${event.punchQuality === '5' ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30' :
                        event.punchQuality === '4' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            'bg-white/5 text-foreground-secondary border border-white/10'
                        }`}>
                        Q{event.punchQuality}
                    </span>
                )}

                {/* Punch Result Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${event.punchResult === 'Landed' || (!event.punchResult && event.landed !== false) ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    event.punchResult === 'Missed' || (!event.punchResult && event.landed === false) ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        event.punchResult === 'Defended' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            event.punchResult === 'Unseen' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                                'bg-white/10 text-foreground-secondary'
                    }`}>
                    {event.punchResult || (event.landed !== false ? 'Landed' : 'Missed')}
                </span>

                {/* Defense Type Badge */}
                {event.defenseType && event.punchResult === 'Defended' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                        {event.defenseType}
                    </span>
                )}

                {/* Knockdown Badge */}
                {event.knockdown && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 uppercase tracking-wider">
                        Knockdown
                    </span>
                )}
            </div>

            {/* Visibility Flags Row 2 */}
            {event.visibilityFlags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {event.visibilityFlags.map((flag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] border border-indigo-500/30">
                            {flag}
                        </span>
                    ))}
                </div>
            )}
        </div>

        {/* Right: Timestamps & Actions */}
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSeek?.(event);
                    }}
                    title="Seek to start time"
                    className="font-mono text-xs text-accent-primary hover:underline cursor-pointer bg-accent-primary/10 px-1.5 py-0.5 rounded"
                >
                    {event.startTime}
                </button>
                <span className="text-foreground-secondary text-[10px]">-</span>
                {event.endTime ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSeekEnd?.(event);
                        }}
                        title="Seek to end time"
                        className="font-mono text-xs text-accent-primary hover:underline cursor-pointer bg-accent-primary/10 px-1.5 py-0.5 rounded"
                    >
                        {event.endTime}
                    </button>
                ) : (
                    <span className="font-mono text-xs text-foreground-secondary">
                        ...
                    </span>
                )}
            </div>

            {!readOnly && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(event.id);
                    }}
                    className="p-1.5 text-foreground-secondary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Event"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    </div>
);

const EventTable = ({
    title,
    data,
    selectedEventId,
    readOnly,
    onSelectEvent,
    onSeek,
    onSeekEnd,
    onDeleteEvent
}: {
    title: string,
    data: EventData[],
    selectedEventId?: string | null,
    readOnly: boolean,
    onSelectEvent?: (event: EventData) => void,
    onSeek?: (event: EventData) => void,
    onSeekEnd?: (event: EventData) => void,
    onDeleteEvent: (eventId: string) => void
}) => (
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
                    <EventRow
                        key={event.id || index}
                        event={event}
                        isLatest={index === 0}
                        isEditing={selectedEventId === event.id}
                        readOnly={readOnly}
                        onSelectEvent={onSelectEvent}
                        onSeek={onSeek}
                        onSeekEnd={onSeekEnd}
                        onDeleteEvent={onDeleteEvent}
                    />
                ))
            )}
        </div>
    </div>
);

const EventLog = ({ events, onStartPunch, onEndPunch, onDeleteEvent, readOnly = false, onSeek, onSeekEnd, onSelectEvent, boxerNames, selectedEventId }: EventLogProps) => {
    // Sort mode: 'recent' = order added (most recent first), 'timestamp' = by video time
    const [sortMode, setSortMode] = useState<'recent' | 'timestamp'>('recent');

    // Get display names for boxers (fallback to generic labels)
    const boxerAName = boxerNames?.boxerA || 'Boxer A';
    const boxerBName = boxerNames?.boxerB || 'Boxer B';

    // Memoize the events split and sorted to avoid re-calculation on every render
    const filteredAndSortedEvents = useMemo(() => {
        const boxerA = events.filter(e => e.boxer === boxerAName || e.boxer === 'Boxer A');
        const boxerB = events.filter(e => e.boxer === boxerBName || e.boxer === 'Boxer B');

        const sortModeToDescending = sortMode === 'recent';

        return {
            boxerA: sortEventsByTimestamp(boxerA, sortModeToDescending),
            boxerB: sortEventsByTimestamp(boxerB, sortModeToDescending)
        };
    }, [events, sortMode, boxerAName, boxerBName]);

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

            {/* Sort Toggle */}
            <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-foreground-secondary">Sort by:</span>
                <button
                    onClick={() => setSortMode(sortMode === 'recent' ? 'timestamp' : 'recent')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-white/10 border border-border rounded-lg text-xs font-medium transition-colors"
                >
                    <ArrowUpDown size={12} />
                    {sortMode === 'recent' ? 'Latest First' : 'Earliest First'}
                </button>
            </div>

            {/* Split View Tables */}
            <div className="flex gap-4">
                <EventTable
                    title={boxerAName}
                    data={filteredAndSortedEvents.boxerA}
                    selectedEventId={selectedEventId}
                    readOnly={readOnly}
                    onSelectEvent={onSelectEvent}
                    onSeek={onSeek}
                    onSeekEnd={onSeekEnd}
                    onDeleteEvent={onDeleteEvent}
                />
                <EventTable
                    title={boxerBName}
                    data={filteredAndSortedEvents.boxerB}
                    selectedEventId={selectedEventId}
                    readOnly={readOnly}
                    onSelectEvent={onSelectEvent}
                    onSeek={onSeek}
                    onSeekEnd={onSeekEnd}
                    onDeleteEvent={onDeleteEvent}
                />
            </div>
        </div>
    );
};

export default EventLog;
