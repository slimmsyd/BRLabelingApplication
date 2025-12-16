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
    const [user, setUser] = useState<{ userId: string; email: string; accountType: string; permissions?: { QC?: boolean; Upload?: boolean; ViewAssignments?: boolean } } | null>(null);

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

    // Load from localStorage on mount (video-specific) - only for events, not submitted state
    // Note: isSubmitted is determined by database assignment status, not localStorage
    useEffect(() => {
        if (!videoId) return;

        const savedEvents = localStorage.getItem(`workspace_events_${videoId}`);

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
        // isSubmitted is NOT loaded from localStorage - it comes from database assignment status
    }, [videoId]);

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

                    // Set isSubmitted based on assignment status from database
                    if (data.assignment?.status) {
                        const submittedStatuses = ['SUBMITTED', 'REVIEWED', 'COMPLETED'];
                        if (submittedStatuses.includes(data.assignment.status)) {
                            setIsSubmitted(true);
                            console.log(`Video assignment status: ${data.assignment.status} - marking as submitted`);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch assignment:', err);
            }
        };

        fetchAssignment();
    }, [videoId]); // Removed user dependency to allow fetching before user loads, and to get global state

    // Fetch saved events from database when assignment is loaded
    useEffect(() => {
        const fetchEventsFromDB = async () => {
            if (!videoId || !assignment?.id) return;

            try {
                const response = await fetch(`/api/videos/${videoId}/events?assignmentId=${assignment.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.events && data.events.length > 0) {
                        // Transform DB events to match EventData interface
                        const dbEvents: EventData[] = data.events.map((e: any) => ({
                            id: e.id,
                            details: `${e.punchType} (${e.hand === 'Left' ? 'L' : 'R'}) - ${e.target}`,
                            startTime: e.startTime,
                            endTime: e.endTime,
                            boxer: e.boxer,
                            punchType: e.punchType,
                            hand: e.hand,
                            target: e.target,
                            visibilityFlags: e.visibilityFlags || [],
                            knockdown: e.knockdown,
                            punchQuality: e.punchQuality,
                            cam: e.cam,
                            stance: e.stance,
                            landed: e.landed,
                            punchResult: e.punchResult,
                            defenseType: e.defenseType,
                        }));
                        setEvents(dbEvents);
                        // Also mark as submitted if we have DB events
                        setIsSubmitted(true);
                        console.log(`Loaded ${dbEvents.length} events from database`);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch events from database:', err);
            }
        };

        fetchEventsFromDB();
    }, [videoId, assignment?.id]);

    // Save events to localStorage whenever they change (video-specific)
    useEffect(() => {
        if (videoId && events.length > 0) {
            localStorage.setItem(`workspace_events_${videoId}`, JSON.stringify(events));
        }
    }, [events, videoId]);

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
        // Explicit save to localStorage (video-specific)
        if (videoId) {
            localStorage.setItem(`workspace_events_${videoId}`, JSON.stringify(events));
        }

    };

    const handleSubmit = async () => {
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

        try {
            // 1. Save to local database (tied to video assignment)
            if (videoId && assignment?.id) {
                const dbPayload = {
                    assignmentId: assignment.id,
                    events: events.map(event => ({
                        startTime: event.startTime,
                        endTime: event.endTime,
                        boxer: event.boxer,
                        punchType: event.punchType,
                        hand: event.hand,
                        target: event.target,
                        visibilityFlags: event.visibilityFlags,
                        knockdown: event.knockdown,
                        punchQuality: event.punchQuality,
                        cam: event.cam,
                        stance: event.stance || 'Orthodox',
                        landed: event.landed,
                        punchResult: event.punchResult || (event.landed !== false ? 'Landed' : 'Missed'),
                        defenseType: event.punchResult === 'Defended' ? event.defenseType : null,
                    })),
                };

                const dbResponse = await fetch(`/api/videos/${videoId}/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbPayload),
                });

                if (!dbResponse.ok) {
                    const errorData = await dbResponse.json();
                    console.error('Failed to save events to database:', errorData);
                    // Continue to external webhook even if local save fails
                } else {
                    console.log('Events saved to database successfully');
                }
            } else {
                console.warn('No videoId or assignment - skipping database save');
            }

            // 2. Send to external webhook (huemanAPI)
            const webhookResponse = await fetch('https://www.huemanapi.com/boxing_fight', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!webhookResponse.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await webhookResponse.json();
            console.log('External webhook success:', data);

            setIsSubmitted(true);
            // Note: isSubmitted state is now determined by database assignment status
            // No need to persist to localStorage
            setShowSuccessModal(true);

        } catch (error) {
            console.error('Error:', error);
            alert('Error submitting data. Please try again.');
        }
    };

    // RBAC Logic - Simplified approach:
    // - Not submitted: Assigned users can edit
    // - Submitted: Read-only for everyone UNLESS QC mode is explicitly activated by authorized users
    const canEdit = React.useMemo(() => {
        if (!user) return false;

        // If video is NOT submitted - check if user can edit (labeling phase)
        if (!isSubmitted) {
            // Admins can always edit
            if (user.accountType === 'ADMIN') return true;

            // Check if user is assigned to this video
            const isAssignedToUser = assignment?.userId === user.userId;
            return isAssignedToUser;
        }

        // If video IS submitted - only allow editing if QC mode is activated
        if (isSubmitted) {
            // Must have QC mode ON to edit
            if (!isQCMode) return false;

            // Must have QC permission or be ADMIN/QUALITY_CONTROL
            const hasQCPermission =
                user.accountType === 'ADMIN' ||
                user.accountType === 'QUALITY_CONTROL' ||
                user.permissions?.QC === true;

            return hasQCPermission;
        }

        return false;
    }, [user, isSubmitted, assignment, isQCMode]);

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
                showQCToggle={isSubmitted && (user?.accountType === 'ADMIN' || user?.accountType === 'QUALITY_CONTROL' || user?.permissions?.QC === true)}
                videoTitle={videoData.title}
                videoMetadata={`${videoData.boxer1} vs ${videoData.boxer2} - Round ${videoData.round}`}
                assignment={assignment}
                onAssign={handleAssign}
                currentUser={user}
            />

            {/* Read-Only Banner - Shows when Labeler is viewing submitted video */}
            {isReadOnly && isSubmitted && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-3 flex items-center justify-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <p className="text-yellow-500 text-sm font-medium">
                        This video has been submitted and is awaiting QC review. Editing is disabled.
                    </p>
                </div>
            )}

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
