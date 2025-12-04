"use client";

import React, { useState, useRef, useEffect } from 'react';
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
    const [stance, setStance] = useState('Orthodox');
    const [landed, setLanded] = useState(true);
    const [activeTimeMode, setActiveTimeMode] = useState<'start' | 'end'>('start');
    const [activeCam, setActiveCam] = useState('CAM 1');

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isQCMode, setIsQCMode] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Load from localStorage on mount and backfill IDs
    useEffect(() => {
        const savedEvents = localStorage.getItem('workspace_events');
        const savedIsSubmitted = localStorage.getItem('workspace_isSubmitted');

        if (savedEvents) {
            const parsedEvents: EventData[] = JSON.parse(savedEvents);
            // Backfill IDs and landed field if missing
            const eventsWithIds = parsedEvents.map(e => ({
                ...e,
                id: e.id || crypto.randomUUID(),
                landed: e.landed !== undefined ? e.landed : true
            }));
            setEvents(eventsWithIds);
        }
        if (savedIsSubmitted) setIsSubmitted(JSON.parse(savedIsSubmitted));
    }, []);

    // Save to localStorage whenever critical state changes
    useEffect(() => {
        localStorage.setItem('workspace_events', JSON.stringify(events));
        localStorage.setItem('workspace_isSubmitted', JSON.stringify(isSubmitted));
    }, [events, isSubmitted]);

    // Handle boxer change
    const handleBoxerChange = (newBoxer: string) => {
        setBoxer(newBoxer);
    };

    const handleLogEvent = (newEventData: Omit<EventData, 'id'>) => {
        const newEvent: EventData = {
            ...newEventData,
            id: crypto.randomUUID(),
        };

        setEvents([newEvent, ...events]);

        // Only reset times if NOT in QC mode (correction mode keeps the time)
        if (!isQCMode) {
            setStartTime('');
            setEndTime('');
        }
    };

    const handleUpdateEvent = (updatedEventData: Omit<EventData, 'id'>) => {
        if (!selectedEventId) return;

        setEvents(events.map(event =>
            event.id === selectedEventId
                ? { ...updatedEventData, id: selectedEventId }
                : event
        ));

        // Clear selection and reset form after update
        setSelectedEventId(null);
        setStartTime('');
        setEndTime('');
        // Reset other form fields to defaults or keep them?
        // Usually better to reset to "ready for next log" state
        setBoxer('Boxer A');
        setPunchType('Jab');
        setHand('Left');
        setTarget('Head');
        setVisibilityFlags([]);
        setKnockdown(false);
        setPunchQuality('1');
        setStance('Orthodox');
        setLanded(true);
    };

    const handleCancelEdit = () => {
        setSelectedEventId(null);
        setStartTime('');
        setEndTime('');
        setBoxer('Boxer A');
        setPunchType('Jab');
        setHand('Left');
        setTarget('Head');
        setVisibilityFlags([]);
        setKnockdown(false);
        setPunchQuality('1');
        setStance('Orthodox');
        setLanded(true);
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
        if (selectedEventId && events[index].id === selectedEventId) {
            handleCancelEdit();
        }
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

    const handleSeek = (event: EventData) => {
        if (videoRef.current) {
            const seconds = parseTimeToSeconds(event.startTime);
            videoRef.current.currentTime = seconds;
        }

        // Only allow editing in QC mode
        if (isQCMode) {
            setSelectedEventId(event.id);
            // Populate form with event data
            setBoxer(event.boxer);
            setPunchType(event.punchType);
            setHand(event.hand);
            setTarget(event.target);
            setVisibilityFlags(event.visibilityFlags);
            setKnockdown(event.knockdown);
            setPunchQuality(event.punchQuality);
            setStance(event.stance || 'Orthodox');
            setLanded(event.landed !== undefined ? event.landed : true);
            setStartTime(event.startTime);
            setEndTime(event.endTime);
        }
    };

    const handleSelectEvent = (event: EventData) => {
        // Populate form with event data
        setSelectedEventId(event.id);
        setBoxer(event.boxer);
        setPunchType(event.punchType);
        setHand(event.hand);
        setTarget(event.target);
        setVisibilityFlags(event.visibilityFlags);
        setKnockdown(event.knockdown);
        setPunchQuality(event.punchQuality);
        setStance(event.stance || 'Orthodox');
        setLanded(event.landed !== undefined ? event.landed : true);
        setStartTime(event.startTime);
        setEndTime(event.endTime);

        // Optional: Seek to start time for context
        if (videoRef.current) {
            const seconds = parseTimeToSeconds(event.startTime);
            videoRef.current.currentTime = seconds;
        }
    };

    // Helper function to convert visibility flags to boolean matrix
    const visibilityFlagsToMatrix = (flags: string[]): number[] => {
        // Fixed order: Full Body, Profile, Origin, Trajectory, Impact
        const flagOrder = ['Full Body', 'Profile', 'Origin', 'Trajectory', 'Impact'];
        return flagOrder.map(flag => flags.includes(flag) ? 1 : 0);
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
                visibility: visibilityFlagsToMatrix(event.visibilityFlags)
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
        // Explicit save to localStorage (redundant with useEffect but good for immediate feedback if needed)
        localStorage.setItem('workspace_events', JSON.stringify(events));

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
                visibility: visibilityFlagsToMatrix(event.visibilityFlags)
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

        // Send to Webhook
        fetch('https://www.huemanapi.com/boxing_fight', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Success:', data);
                setIsSubmitted(true);
                localStorage.setItem('workspace_isSubmitted', 'true');
                alert('Submission successful!');
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('Error submitting data. Please try again.');
            });
    };

    const isReadOnly = isSubmitted || isQCMode;
    // In direct edit mode, sidebar is NOT read-only if we are in QC mode.
    // It is only read-only if submitted and NOT in QC mode.
    // Actually, if submitted, we might want to allow QC edits?
    // The requirement says "QC side... editing the current fight's database".
    // So if isQCMode is true, we should allow editing even if isSubmitted is true?
    // Let's assume QC mode overrides submission lock for the purpose of correction.
    const isSidebarReadOnly = isSubmitted && !isQCMode;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <WorkspaceHeader
                onSave={handleSaveProgress}
                onSubmit={handleSubmit}
                readOnly={isSubmitted}
                isQCMode={isQCMode}
                onToggleQCMode={() => {
                    setIsQCMode(!isQCMode);
                    if (isQCMode) handleCancelEdit(); // Clear selection when exiting QC mode
                }}
            />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Left Sidebar: Controls */}
                <aside className="w-[320px] border-r border-border bg-background overflow-y-auto p-4 shrink-0">
                    <SidebarControls
                        onLogEvent={handleLogEvent}
                        getCurrentTime={getCurrentTime}
                        formState={{ boxer, startTime, endTime, punchType, hand, target, visibilityFlags, knockdown, punchQuality, stance, landed }}
                        setFormState={{ setBoxer: handleBoxerChange, setStartTime, setEndTime, setPunchType, setHand, setTarget, setVisibilityFlags, setKnockdown, setPunchQuality, setStance, setLanded }}
                        activeTimeMode={activeTimeMode}
                        setActiveTimeMode={setActiveTimeMode}
                        activeCam={activeCam}
                        readOnly={isSidebarReadOnly}
                        isEditing={!!selectedEventId}
                        onUpdateEvent={handleUpdateEvent}
                        onCancelEdit={handleCancelEdit}
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
                                readOnly={isReadOnly}
                                onSeek={handleSeek}
                                onSelectEvent={handleSelectEvent}
                            />
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
