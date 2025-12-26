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
    weightClass?: string;
    venue?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Parse boxer names from video title.
 * Expected format: "Abdullah_Mason v Sam_Noakes - R1" or "Name1 vs Name2 - R1"
 * Returns { boxerA, boxerB } with cleaned names (underscores replaced with spaces)
 */
function parseBoxerNamesFromTitle(title: string): { boxerA: string; boxerB: string } | null {
    if (!title) return null;

    // Match " v " or " vs " (case insensitive)
    const vsMatch = title.match(/^(.+?)\s+(?:v|vs)\s+(.+?)(?:\s*-\s*R\d+)?$/i);

    if (vsMatch) {
        // Clean up names: replace underscores with spaces, trim whitespace
        const cleanName = (name: string) => name.replace(/_/g, ' ').trim();

        return {
            boxerA: cleanName(vsMatch[1]),
            boxerB: cleanName(vsMatch[2])
        };
    }

    return null;
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
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Resizable sidebar state
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const isResizing = useRef(false);
    const sidebarRef = useRef<HTMLElement>(null);

    // Sidebar resize handlers
    const startResizing = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;

            const newWidth = e.clientX;
            // Min width: 320px (current), Max width: 600px (or half the viewport)
            const maxWidth = Math.min(600, window.innerWidth * 0.5);
            if (newWidth >= 320 && newWidth <= maxWidth) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

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
                console.warn('[VIDEO DEBUG] No videoId in URL params');
                return;
            }
            console.log('[VIDEO DEBUG] Fetching video data for ID:', videoId);

            try {
                setVideoLoading(true);
                const response = await fetch(`/api/videos/${videoId}`);

                console.log('[VIDEO DEBUG] API response status:', response.status, response.statusText);

                if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('[VIDEO DEBUG] Raw API response:', JSON.stringify(data, null, 2));
                console.log('[VIDEO DEBUG] Video data:', {
                    id: data.video?.id,
                    title: data.video?.title,
                    sourceUrls: data.video?.sourceUrls,
                    storagePath: data.video?.storagePath,
                    storageProvider: data.video?.storageProvider,
                    numCameraViews: data.video?.numCameraViews
                });

                setVideoData(data.video);
                setVideoError(null);
            } catch (err) {
                console.error('[VIDEO DEBUG] Error fetching video:', err);
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
                        // Note: Don't set isSubmitted here - that's determined by assignment.status
                        // Having events in DB just means progress was saved, not necessarily submitted
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

        // Only reset times if NOT editing an event (keep times when editing for convenience)
        if (!selectedEventId) {
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

    const handleDeleteEvent = (eventId: string) => {
        setEvents(events.filter(event => event.id !== eventId));
        if (selectedEventId === eventId) {
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

        // Allow editing if:
        // 1. Not submitted (labelers can edit their own work before submission)
        // 2. OR in QC mode (QC reviewers can edit after submission)
        if (!isSubmitted || isQCMode) {
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

    const handleSaveProgress = async () => {
        setSaveStatus('saving');

        try {
            // Save to localStorage (video-specific)
            if (videoId) {
                localStorage.setItem(`workspace_events_${videoId}`, JSON.stringify(events));
            }

            // Save to database so admins can see progress (but NOT submit/finalize)
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
                    saveOnly: true, // Flag to indicate this is a progress save, NOT a submission
                };

                const response = await fetch(`/api/videos/${videoId}/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbPayload),
                });

                if (!response.ok) {
                    throw new Error('Failed to save progress to database');
                }
                console.log('Progress saved to database (not submitted)');
            }

            setSaveStatus('saved');

            // Reset status after 2 seconds
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Error saving progress:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleSubmit = async () => {
        // Transform events to external API format
        const transformEventForExternalAPI = (event: EventData) => ({
            eventType: "punch",
            fighter: event.boxer === 'Boxer A' ? 'boxer1' : 'boxer2',
            startTime: parseTimeToSeconds(event.startTime),
            endTime: parseTimeToSeconds(event.endTime),
            hand: event.hand.toLowerCase(),
            punchType: event.punchType,
            target: event.target,
            punchQuality: event.punchQuality,
            knockdown: event.knockdown,
            stoppageKo: false,
            visibility: visibilityFlagsToMatrix(event.visibilityFlags),
            stance: event.stance || 'Orthodox',
            punchResult: event.punchResult || (event.landed !== false ? 'Landed' : 'Missed'),
            defenseType: event.punchResult === 'Defended' ? event.defenseType : null
        });

        // Group events by camera
        const groupEventsByCamera = (events: EventData[], numCameras: number) => {
            const cameras: { [key: string]: any[] } = {};

            // Initialize camera arrays
            for (let i = 1; i <= numCameras; i++) {
                cameras[`Cam${i}`] = [];
            }

            // Group events by their camera
            events.forEach(event => {
                const camKey = event.cam || 'Cam1'; // Default to Cam1 if not specified
                // Normalize camera key format (e.g., "CAM 1" -> "Cam1")
                const normalizedCam = camKey.replace(/CAM\s*/i, 'Cam').replace(/\s+/g, '');

                if (cameras[normalizedCam]) {
                    cameras[normalizedCam].push(transformEventForExternalAPI(event));
                } else {
                    // If camera doesn't exist in our range, add to Cam1
                    cameras['Cam1'].push(transformEventForExternalAPI(event));
                }
            });

            return cameras;
        };

        // Format date as YYYY-MM-DD
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        };

        // Build the external API payload
        const roundKey = `RD${videoData?.round || 1}`;
        const numCameras = videoData?.numCameraViews || 3;

        // Initialize rounds object with empty camera arrays
        const initializeRounds = () => {
            const rounds: { [key: string]: { [cam: string]: any[] } } = {};
            rounds[roundKey] = {};
            for (let i = 1; i <= numCameras; i++) {
                rounds[roundKey][`Cam${i}`] = [];
            }
            return rounds;
        };

        const rounds = initializeRounds();
        const eventsByCamera = groupEventsByCamera(events, numCameras);
        rounds[roundKey] = eventsByCamera;

        const externalPayload = {
            fight_title: videoData?.title || `${videoData?.boxer1} vs ${videoData?.boxer2}`,
            metadata: {
                venue: videoData?.venue || '',
                date: formatDate(videoData?.fightDate || ''),
                weight_class: videoData?.weightClass || '',
                num_cameras: numCameras
            },
            rounds: rounds
        };

        console.log('Submitting to External API:', JSON.stringify(externalPayload, null, 2));

        try {
            // 1. Save to local database (tied to video assignment) - unchanged format
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

            // 2. Send to external webhook (huemanAPI) with new format
            const webhookResponse = await fetch('https://www.huemanAPI.com/boxing_fight', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(externalPayload),
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
        if (!videoData?.sourceUrls) {
            console.log('[VIDEO DEBUG] No sourceUrls in videoData');
            return undefined;
        }

        const urls = videoData.sourceUrls;
        console.log('[VIDEO DEBUG] Parsing sourceUrls:', {
            raw: urls,
            type: typeof urls,
            isArray: Array.isArray(urls),
            keys: typeof urls === 'object' ? Object.keys(urls) : 'N/A'
        });

        const parsed = {
            cam1: urls.cam1 || urls[0],
            cam2: urls.cam2 || urls[1],
            cam3: urls.cam3 || urls[2],
        };

        console.log('[VIDEO DEBUG] Parsed video sources:', {
            cam1: parsed.cam1 ? `${parsed.cam1.substring(0, 80)}...` : 'EMPTY/UNDEFINED',
            cam2: parsed.cam2 ? `${parsed.cam2.substring(0, 80)}...` : 'EMPTY/UNDEFINED',
            cam3: parsed.cam3 ? `${parsed.cam3.substring(0, 80)}...` : 'EMPTY/UNDEFINED',
        });

        return parsed;
    }, [videoData]);

    // Parse boxer names from video title, fallback to database fields
    const boxerNames = React.useMemo(() => {
        if (!videoData) return undefined;

        // Try to parse from title first
        const parsedNames = parseBoxerNamesFromTitle(videoData.title);

        if (parsedNames) {
            return parsedNames;
        }

        // Fallback to database fields if they exist and aren't empty
        if (videoData.boxer1 && videoData.boxer2) {
            return {
                boxerA: videoData.boxer1,
                boxerB: videoData.boxer2
            };
        }

        return undefined;
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
                showQCToggle={user?.accountType === 'ADMIN' || (isSubmitted && (user?.accountType === 'QUALITY_CONTROL' || user?.permissions?.QC === true))}
                videoTitle={videoData.title}
                videoMetadata={`${videoData.boxer1} vs ${videoData.boxer2} - Round ${videoData.round}`}
                assignment={assignment}
                onAssign={handleAssign}
                currentUser={user}
                saveStatus={saveStatus}
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
                {/* Left Sidebar: Controls - Resizable */}
                <aside
                    ref={sidebarRef}
                    style={{ width: sidebarWidth }}
                    className="relative border-r border-border bg-background p-4 shrink-0 flex flex-col"
                >
                    <div className="flex-1 min-h-0">
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
                            boxerNames={boxerNames}
                        />
                    </div>

                    {/* Resize Handle */}
                    <div
                        onMouseDown={startResizing}
                        className="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize hover:bg-accent-primary/50 active:bg-accent-primary transition-colors group"
                        title="Drag to resize"
                    >
                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-12 bg-foreground-secondary/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
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
                                fps={videoData.fps}
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
                                boxerNames={boxerNames}
                                selectedEventId={selectedEventId}
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
