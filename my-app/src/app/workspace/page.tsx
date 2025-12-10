"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import VideoPlayer from '@/components/workspace/VideoPlayer';
import EventLog, { EventData } from '@/components/workspace/EventLog';
import SidebarControls from '@/components/workspace/SidebarControls';
import SuccessModal from '@/components/SuccessModal';
import { Loader2 } from 'lucide-react';

interface VideoData {
    id: string;
    title: string;
    description?: string;
    boxer1: string;
    boxer2: string;
    round: number;
    segment: string;
    fightDate: string;
    fps: number;
    numCameraViews: number;
    sourceUrls: any; // JSON field
    storagePath?: string;
    storageProvider: string;
    duration?: number;
    createdAt: string;
    updatedAt: string;
}

function WorkspacePage() {
    const searchParams = useSearchParams();
    const videoId = searchParams.get('videoId');

    const [videoData, setVideoData] = useState<VideoData | null>(null);
    const [videoLoading, setVideoLoading] = useState(true);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [assignment, setAssignment] = useState<any>(null);
    const [user, setUser] = useState<{ userId: string; email: string; accountType: string } | null>(null);

    const [events, setEvents] = useState<EventData[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Lifted State for Form
    const [boxer, setBoxer] = useState('');
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
    const [punchResult, setPunchResult] = useState('Landed');
    const [defenseType, setDefenseType] = useState('Guard');
    const [activeTimeMode, setActiveTimeMode] = useState<'start' | 'end'>('start');
    const [activeCam, setActiveCam] = useState('CAM 1');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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
                landed: e.landed !== undefined ? e.landed : true,
                // Backfill punchResult based on landed if missing
                punchResult: e.punchResult || (e.landed !== false ? 'Landed' : 'Missed')
            }));
            setEvents(eventsWithIds);
        }
        if (savedIsSubmitted) setIsSubmitted(JSON.parse(savedIsSubmitted));
    }, []);

    // Fetch video data when videoId is available
    useEffect(() => {
        const fetchVideo = async () => {
            if (!videoId) {
                setVideoLoading(false);
                setVideoError('No video ID provided');
                return;
            }

            try {
                setVideoLoading(true);
                const response = await fetch(`/api/videos/${videoId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch video');
                }

                const data = await response.json();
                setVideoData(data.video);
                setVideoError(null);
            } catch (err) {
                setVideoError(err instanceof Error ? err.message : 'Failed to load video');
            } finally {
                setVideoLoading(false);
            }
        };

        fetchVideo();
    }, [videoId]);

    // Fetch assignment when video is loaded
    useEffect(() => {
        const fetchAssignment = async () => {
            if (!videoId) return;

            try {
                // Fetch assignment without userId to get *any* existing assignment (default OFFENSE)
                const response = await fetch(`/api/videos/${videoId}/assignment`);
                if (response.ok) {
                    const data = await response.json();
                    setAssignment(data.assignment);
                }
            } catch (err) {
                console.error('Failed to fetch assignment:', err);
            }
        };

        fetchAssignment();
    }, [videoId]); // Removed user dependency to allow fetching before user loads, and to get global state

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
        setPunchResult('Landed');
        setDefenseType('Guard');
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
        setPunchResult('Landed');
        setDefenseType('Guard');
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
            setPunchResult(event.punchResult || (event.landed !== false ? 'Landed' : 'Missed'));
            setDefenseType(event.defenseType || 'Guard');
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
        setPunchResult(event.punchResult || (event.landed !== false ? 'Landed' : 'Missed'));
        setDefenseType(event.defenseType || 'Guard');
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

    // Fetch user on mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    // Auto-enable QC mode for QC/Admin if submitted
                    if ((data.accountType === 'QUALITY_CONTROL' || data.accountType === 'ADMIN') && isSubmitted) {
                        setIsQCMode(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, [isSubmitted]);

    const handleSaveProgress = () => {
        const transformEvents = (boxerEvents: EventData[]) => {
            return boxerEvents.map(event => ({
                cam: event.cam ? [event.cam] : [],
                endTime: parseTimeToSeconds(event.endTime),
                hand: event.hand.toLowerCase(),
                knockdown: event.knockdown ? 1 : 0,
                landed: event.landed !== false ? 1 : null,
                punchQuality: event.landed !== false ? event.punchQuality : null,
                punchType: event.punchType,
                startTime: parseTimeToSeconds(event.startTime),
                stoppageKo: false,
                target: event.target,
                visibility: visibilityFlagsToMatrix(event.visibilityFlags),
                stance: event.stance || 'Orthodox',
                punchResult: event.punchResult || (event.landed !== false ? 'Landed' : 'Missed'),
                defenseType: event.punchResult === 'Defended' ? event.defenseType : null
            }));
        };

        const payload = {
            submittedBy: user?.userId,
            submitterEmail: user?.email,
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
                landed: event.landed !== false ? 1 : null,
                punchQuality: event.landed !== false ? event.punchQuality : null,
                punchType: event.punchType,
                startTime: parseTimeToSeconds(event.startTime),
                stoppageKo: false,
                target: event.target,
                visibility: visibilityFlagsToMatrix(event.visibilityFlags),
                stance: event.stance || 'Orthodox',
                punchResult: event.punchResult || (event.landed !== false ? 'Landed' : 'Missed'),
                defenseType: event.punchResult === 'Defended' ? event.defenseType : null
            }));
        };

        const payload = {
            submittedBy: user?.userId,
            submitterEmail: user?.email,
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
                setShowSuccessModal(true);
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('Error submitting data. Please try again.');
            });
    };

    // RBAC Logic
    // RBAC Logic
    const canEdit = React.useMemo(() => {
        if (!user) return false;

        if (user.accountType === 'ADMIN') return true;

        // Check if user is assigned to this video
        const isAssignedToUser = assignment?.userId === user.userId;

        if (!isAssignedToUser) return false; // Must be assigned to edit (unless Admin)

        if (user.accountType === 'LABELER') {
            return !isSubmitted; // Labelers can only edit if NOT submitted
        }

        if (user.accountType === 'QUALITY_CONTROL') {
            return isSubmitted; // QC can only edit if SUBMITTED
        }

        return false;
    }, [user, isSubmitted, assignment]);

    // Read-only state derived from canEdit
    // If canEdit is true, readOnly is false.
    const isReadOnly = !canEdit;

    // Sidebar specific logic
    // If we are in QC mode (and allowed to be), sidebar should be editable for corrections
    // But if we are a Labeler and it's submitted, it's read-only.
    const isSidebarReadOnly = isReadOnly;

    // Parse video sources from videoData
    const videoSources = React.useMemo(() => {
        if (!videoData?.sourceUrls) return undefined;

        const urls = videoData.sourceUrls;
        return {
            cam1: urls.cam1 || urls[0],
            cam2: urls.cam2 || urls[1],
            cam3: urls.cam3 || urls[2],
        };
    }, [videoData]);

    // Show loading state
    if (videoLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-accent-primary mx-auto mb-4" />
                    <p className="text-foreground-secondary">Loading video...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (videoError || !videoData) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center max-w-md">
                    <p className="text-red-500 mb-4">{videoError || 'Video not found'}</p>
                    <a href="/" className="text-accent-primary hover:underline">
                        Return to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    const handleAssign = async () => {
        if (!user?.userId || !user?.email || !videoId) return;

        try {
            const response = await fetch(`/api/videos/${videoId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    email: user.email,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setAssignment(data.assignment);
            } else {
                alert('Failed to assign video');
            }
        } catch (err) {
            console.error('Assignment error:', err);
            alert('Error assigning video');
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <WorkspaceHeader
                onSave={handleSaveProgress}
                onSubmit={handleSubmit}
                readOnly={isReadOnly}
                isQCMode={isQCMode}
                onToggleQCMode={() => {
                    setIsQCMode(!isQCMode);
                    if (isQCMode) handleCancelEdit(); // Clear selection when exiting QC mode
                }}
                showQCToggle={user?.accountType === 'ADMIN' || user?.accountType === 'QUALITY_CONTROL'}
                videoTitle={videoData.title}
                videoMetadata={`${videoData.boxer1} vs ${videoData.boxer2} - Round ${videoData.round}`}
                assignment={assignment}
                onAssign={handleAssign}
                currentUser={user}
            />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Left Sidebar: Controls */}
                <aside className="w-[320px] border-r border-border bg-background overflow-y-auto p-4 shrink-0">
                    <SidebarControls
                        onLogEvent={handleLogEvent}
                        getCurrentTime={getCurrentTime}
                        formState={{ boxer, startTime, endTime, punchType, hand, target, visibilityFlags, knockdown, punchQuality, stance, landed, punchResult, defenseType }}
                        setFormState={{ setBoxer: handleBoxerChange, setStartTime, setEndTime, setPunchType, setHand, setTarget, setVisibilityFlags, setKnockdown, setPunchQuality, setStance, setLanded, setPunchResult, setDefenseType }}
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
                                videoSources={videoSources}
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
            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
            />
        </div>
    );
}

// Loading component for Suspense boundary
function WorkspaceLoading() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <div className="text-center">
                <Loader2 size={48} className="animate-spin text-accent-primary mx-auto mb-4" />
                <p className="text-foreground-secondary">Loading workspace...</p>
            </div>
        </div>
    );
}

// Export wrapped component with Suspense boundary
export default function WorkspacePageWithSuspense() {
    return (
        <Suspense fallback={<WorkspaceLoading />}>
            <WorkspacePage />
        </Suspense>
    );
}
