"use client";

import React, { useState, useRef } from 'react';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import VideoPlayer from '@/components/workspace/VideoPlayer';
import EventLog, { EventData } from '@/components/workspace/EventLog';
import SidebarControls from '@/components/workspace/SidebarControls';

export default function WorkspacePage() {
    const [events, setEvents] = useState<EventData[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Lifted State for Form
    const [boxer, setBoxer] = useState('Boxer A');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [punchType, setPunchType] = useState('Jab');
    const [hand, setHand] = useState('Left');
    const [target, setTarget] = useState('Head');
    const [visibilityFlags, setVisibilityFlags] = useState<string[]>([]);
    const [knockdown, setKnockdown] = useState(false);
    const [punchQuality, setPunchQuality] = useState('1');
    const [activeTimeMode, setActiveTimeMode] = useState<'start' | 'end'>('start');
    const [activeCam, setActiveCam] = useState('CAM 1');

    // Saved states for each boxer
    const [boxerStates, setBoxerStates] = useState({
        'Boxer A': {
            punchType: 'Jab',
            hand: 'Left',
            target: 'Head',
            visibilityFlags: [] as string[],
            knockdown: false,
            punchQuality: '1',
        },
        'Boxer B': {
            punchType: 'Jab',
            hand: 'Left',
            target: 'Head',
            visibilityFlags: [] as string[],
            knockdown: false,
            punchQuality: '1',
        },
    });

    // Handle boxer change with state preservation
    const handleBoxerChange = (newBoxer: string) => {
        // Save current boxer's state
        setBoxerStates({
            ...boxerStates,
            [boxer]: {
                punchType,
                hand,
                target,
                visibilityFlags,
                knockdown,
                punchQuality,
            },
        });

        // Switch to new boxer
        setBoxer(newBoxer);

        // Load saved state for new boxer
        const savedState = boxerStates[newBoxer as keyof typeof boxerStates];
        setPunchType(savedState.punchType);
        setHand(savedState.hand);
        setTarget(savedState.target);
        setVisibilityFlags(savedState.visibilityFlags);
        setKnockdown(savedState.knockdown);
        setPunchQuality(savedState.punchQuality);
    };

    const handleLogEvent = (newEvent: EventData) => {
        setEvents([newEvent, ...events]);
        // Reset times after logging
        setStartTime('');
        setEndTime('');
    };

    const getCurrentTime = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            const milliseconds = Math.floor((time % 1) * 100);
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        }
        return '00:00.00';
    };

    // Quick Action Handlers
    const handleStartPunch = () => {
        setStartTime(getCurrentTime());
        setActiveTimeMode('start');
    };

    const handleEndPunch = () => {
        setEndTime(getCurrentTime());
        setActiveTimeMode('end');
    };

    const handleDeleteEvent = (index: number) => {
        setEvents(events.filter((_, i) => i !== index));
    };

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

    const handleSaveProgress = () => {
        const transformEvents = (boxerEvents: EventData[]) => {
            return boxerEvents.map(event => ({
                cam: event.cam ? [event.cam] : [],
                endTime: parseTimeToSeconds(event.endTime),
                hand: event.hand.toLowerCase(),
                knockdown: event.knockdown ? 1 : 0,
                punchQuality: event.punchQuality,
                punchType: event.punchType,
                startTime: parseTimeToSeconds(event.startTime),
                stoppageKo: false,
                target: event.target,
                visibility: event.visibilityFlags.length > 0 ? 1 : 0
            }));
        };

        const payload = {
            boxer1: {
                punches: transformEvents(events.filter(e => e.boxer === 'Boxer A'))
            },
            boxer2: {
                punches: transformEvents(events.filter(e => e.boxer === 'Boxer B'))
            }
        };

        console.log('Saving Progress:', JSON.stringify(payload, null, 2));
    };

    const handleSubmit = () => {
        const transformEvents = (boxerEvents: EventData[]) => {
            return boxerEvents.map(event => ({
                cam: event.cam ? [event.cam] : [],
                endTime: parseTimeToSeconds(event.endTime),
                hand: event.hand.toLowerCase(),
                knockdown: event.knockdown ? 1 : 0,
                punchQuality: event.punchQuality,
                punchType: event.punchType,
                startTime: parseTimeToSeconds(event.startTime),
                stoppageKo: false,
                target: event.target,
                visibility: event.visibilityFlags.length > 0 ? 1 : 0
            }));
        };

        const payload = {
            boxer1: {
                punches: transformEvents(events.filter(e => e.boxer === 'Boxer A'))
            },
            boxer2: {
                punches: transformEvents(events.filter(e => e.boxer === 'Boxer B'))
            }
        };

        console.log('Submitting Final Data:', JSON.stringify(payload, null, 2));
        // Here you would typically make an API call
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <WorkspaceHeader onSave={handleSaveProgress} onSubmit={handleSubmit} />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Left Sidebar: Controls */}
                <aside className="w-[320px] border-r border-border bg-background overflow-y-auto p-4 shrink-0">
                    <SidebarControls
                        onLogEvent={handleLogEvent}
                        getCurrentTime={getCurrentTime}
                        formState={{ boxer, startTime, endTime, punchType, hand, target, visibilityFlags, knockdown, punchQuality }}
                        setFormState={{ setBoxer: handleBoxerChange, setStartTime, setEndTime, setPunchType, setHand, setTarget, setVisibilityFlags, setKnockdown, setPunchQuality }}
                        activeTimeMode={activeTimeMode}
                        setActiveTimeMode={setActiveTimeMode}
                        activeCam={activeCam}
                    />
                </aside>

                {/* Main Content: Video & Table */}
                <main className="flex-1 p-6 bg-black/20 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Video Player */}
                        <section>
                            <VideoPlayer
                                videoRef={videoRef}
                                activeCam={activeCam}
                                setActiveCam={setActiveCam}
                            />
                        </section>

                        {/* Event Log Table */}
                        <section>
                            <EventLog
                                events={events}
                                onStartPunch={handleStartPunch}
                                onEndPunch={handleEndPunch}
                                onDeleteEvent={handleDeleteEvent}
                            />
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
