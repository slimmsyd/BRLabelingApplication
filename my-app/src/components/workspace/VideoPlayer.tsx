import React, { useState, useEffect, useRef, RefObject } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, Volume2, VolumeX, Volume1, Settings, Gauge, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

type VideoSize = 'small' | 'medium' | 'large';

interface VideoPlayerProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    activeCam: string;
    setActiveCam: (cam: string) => void;
    videoSources?: {
        cam1?: string;
        cam2?: string;
        cam3?: string;
    };
    fps?: number; // Video frame rate for frame-by-frame navigation
}

interface VideoLoadingState {
    cam1: 'loading' | 'ready' | 'error' | 'idle';
    cam2: 'loading' | 'ready' | 'error' | 'idle';
    cam3: 'loading' | 'ready' | 'error' | 'idle';
}

const VideoPlayer = ({ videoRef, activeCam, setActiveCam, videoSources, fps = 30 }: VideoPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // Separate visual progress for smooth dragging (YouTube-style)
    const [visualProgress, setVisualProgress] = useState(0);
    const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [skipDuration, setSkipDuration] = useState(2);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [customSkipInput, setCustomSkipInput] = useState('2');

    // Zoom and Pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const [zoomModeEnabled, setZoomModeEnabled] = useState(false);

    // Timestamp sync for multi-camera switching
    const previousTimeRef = useRef<number>(0);
    const previousCamRef = useRef<string>(activeCam);
    const wasPlayingRef = useRef<boolean>(false);
    const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

    // Video size state
    const [videoSize, setVideoSize] = useState<VideoSize>('large');

    // PRELOADING: Create refs for all video elements
    const cam1Ref = useRef<HTMLVideoElement>(null);
    const cam2Ref = useRef<HTMLVideoElement>(null);
    const cam3Ref = useRef<HTMLVideoElement>(null);

    // Track loading state for each camera
    const [videoLoadingState, setVideoLoadingState] = useState<VideoLoadingState>({
        cam1: 'idle',
        cam2: 'idle',
        cam3: 'idle',
    });

    // Helper to get the active video element based on current camera
    const getActiveVideoElement = (): HTMLVideoElement | null => {
        switch (activeCam) {
            case 'CAM 1': return cam1Ref.current;
            case 'CAM 2': return cam2Ref.current;
            case 'CAM 3': return cam3Ref.current;
            default: return cam1Ref.current;
        }
    };

    // Helper to get all video refs
    const getAllVideoRefs = () => [cam1Ref, cam2Ref, cam3Ref];

    // Video size configurations
    const sizeConfig = {
        small: { maxWidth: '480px', label: 'S' },
        medium: { maxWidth: '720px', label: 'M' },
        large: { maxWidth: '100%', label: 'L' },
    };

    // Sync the parent's videoRef to always point to the active video element
    useEffect(() => {
        const activeVideo = getActiveVideoElement();
        if (videoRef.current !== activeVideo) {
            // @ts-ignore - Update parent ref to point to active video
            videoRef.current = activeVideo;
        }
    }, [activeCam, videoRef]);

    // LAZY LOADING: Only fully preload active camera on INITIAL LOAD
    // Camera switch sync is handled separately - don't interfere with it
    const initialActiveCamRef = useRef(activeCam);

    useEffect(() => {
        if (!videoSources) return;

        // Use the initial active camera for first load preload decisions
        const getActiveCamKey = (cam: string): 'cam1' | 'cam2' | 'cam3' => {
            switch (cam) {
                case 'CAM 1': return 'cam1';
                case 'CAM 2': return 'cam2';
                case 'CAM 3': return 'cam3';
                default: return 'cam1';
            }
        };
        const initialActiveCamKey = getActiveCamKey(initialActiveCamRef.current);

        console.log('\n🎬 [VIDEO LAZY LOAD] Initial active camera:', initialActiveCamRef.current);
        console.log('📹 CAM 1:', videoSources.cam1 ? 'HAS URL' : 'MISSING');
        console.log('📹 CAM 2:', videoSources.cam2 ? 'HAS URL' : 'MISSING');
        console.log('📹 CAM 3:', videoSources.cam3 ? 'HAS URL' : 'MISSING');

        const setupVideo = (
            ref: React.RefObject<HTMLVideoElement | null>,
            camName: 'cam1' | 'cam2' | 'cam3',
            url: string | undefined
        ) => {
            const video = ref.current;
            if (!video || !url) return;

            const isInitialActive = camName === initialActiveCamKey;

            // Only mark as loading if it's the initial active camera doing full preload
            if (isInitialActive) {
                console.log(`⚡ [${camName.toUpperCase()}] INITIAL ACTIVE - Full preload (auto)`);
                setVideoLoadingState(prev => ({ ...prev, [camName]: 'loading' }));
            } else {
                console.log(`💤 [${camName.toUpperCase()}] INACTIVE - Metadata only`);
            }

            const handleCanPlay = () => {
                console.log(`✅ [${camName.toUpperCase()}] Ready! Duration: ${video.duration}s`);
                setVideoLoadingState(prev => ({ ...prev, [camName]: 'ready' }));
            };

            const handleLoadedMetadata = () => {
                // For inactive cameras, mark as ready once metadata loads
                if (!isInitialActive) {
                    console.log(`📋 [${camName.toUpperCase()}] Metadata loaded. Duration: ${video.duration}s`);
                    setVideoLoadingState(prev => ({ ...prev, [camName]: 'ready' }));
                }
            };

            const handleError = (e: Event) => {
                console.error(`❌ [${camName.toUpperCase()}] Load error:`, video.error);
                setVideoLoadingState(prev => ({ ...prev, [camName]: 'error' }));
            };

            video.addEventListener('canplay', handleCanPlay, { once: true });
            video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
            video.addEventListener('error', handleError, { once: true });

            // KEY: Only full preload for initial active camera
            video.preload = isInitialActive ? 'auto' : 'metadata';
            video.load();

            return () => {
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                video.removeEventListener('error', handleError);
            };
        };

        // Setup all cameras with appropriate preload strategy
        const cleanup1 = setupVideo(cam1Ref, 'cam1', videoSources.cam1);
        const cleanup2 = setupVideo(cam2Ref, 'cam2', videoSources.cam2);
        const cleanup3 = setupVideo(cam3Ref, 'cam3', videoSources.cam3);

        return () => {
            cleanup1?.();
            cleanup2?.();
            cleanup3?.();
        };
    }, [videoSources]); // Only run on initial source load, NOT on camera switch

    // Apply volume and playback rate to ALL videos (keep them in sync)
    useEffect(() => {
        const videos = [cam1Ref.current, cam2Ref.current, cam3Ref.current];
        videos.forEach(video => {
            if (video) {
                video.volume = volume;
                video.muted = isMuted;
                video.playbackRate = playbackRate;
            }
        });
    }, [volume, isMuted, playbackRate]);

    // Update progress as video plays + DEBUG EVENT HANDLERS
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            setCurrentTime(video.currentTime);
            const newProgress = (video.currentTime / video.duration) * 100 || 0;
            setProgress(newProgress);
            // Only update visual progress if not dragging
            if (!isDragging) {
                setVisualProgress(newProgress);
            }
        };

        const updateDuration = () => {
            console.log('[VIDEO DEBUG] loadedmetadata fired - duration:', video.duration);
            setDuration(video.duration);
        };

        // DEBUG: Error handler
        const handleError = (e: Event) => {
            const mediaError = video.error;
            console.error('[VIDEO DEBUG] ❌ VIDEO ERROR:', {
                code: mediaError?.code,
                message: mediaError?.message,
                MEDIA_ERR_ABORTED: mediaError?.code === 1,
                MEDIA_ERR_NETWORK: mediaError?.code === 2,
                MEDIA_ERR_DECODE: mediaError?.code === 3,
                MEDIA_ERR_SRC_NOT_SUPPORTED: mediaError?.code === 4,
                currentSrc: video.currentSrc,
                networkState: video.networkState,
                readyState: video.readyState
            });
        };

        // DEBUG: Loading events
        const handleLoadStart = () => {
            console.log('[VIDEO DEBUG] loadstart - Beginning to load:', video.currentSrc?.substring(0, 80));
        };

        const handleCanPlay = () => {
            console.log('[VIDEO DEBUG] ✅ canplay - Video is ready to play');
        };

        const handleCanPlayThrough = () => {
            console.log('[VIDEO DEBUG] ✅ canplaythrough - Video can play through without buffering');
        };

        const handleStalled = () => {
            console.warn('[VIDEO DEBUG] ⚠️ stalled - Download stalled');
        };

        const handleWaiting = () => {
            console.log('[VIDEO DEBUG] waiting - Buffering...');
        };

        const handleSuspend = () => {
            console.log('[VIDEO DEBUG] suspend - Download suspended (normal for lazy loading)');
        };

        const handleProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                console.log('[VIDEO DEBUG] progress - Buffered:', Math.round(bufferedEnd), 'seconds');
            }
        };

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('error', handleError);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.addEventListener('stalled', handleStalled);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('suspend', handleSuspend);
        video.addEventListener('progress', handleProgress);

        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('error', handleError);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
            video.removeEventListener('stalled', handleStalled);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('suspend', handleSuspend);
            video.removeEventListener('progress', handleProgress);
        };
    }, [videoRef, activeCam, isDragging]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input or textarea
            if (document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault(); // Prevent scrolling
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    stepFrameBackward();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    stepFrameForward();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, fps]); // Dependencies for togglePlay and frame step functions

    // INSTANT camera switching with preloaded videos + TIMESTAMP SYNC DEBUGGING
    useEffect(() => {
        // Skip on initial mount
        if (previousCamRef.current === activeCam) return;

        const switchStartTime = performance.now();
        console.log('\n🎥 [CAMERA SWITCH + TIMESTAMP SYNC DEBUG] ===========================');
        console.log('🔄 Switching camera:', previousCamRef.current, '->', activeCam);

        // Get previous and new video elements
        const getPrevVideoElement = (): HTMLVideoElement | null => {
            switch (previousCamRef.current) {
                case 'CAM 1': return cam1Ref.current;
                case 'CAM 2': return cam2Ref.current;
                case 'CAM 3': return cam3Ref.current;
                default: return null;
            }
        };

        const prevVideo = getPrevVideoElement();
        const newVideo = getActiveVideoElement();

        if (!prevVideo || !newVideo) {
            console.warn('⚠️  Missing video element(s)');
            previousCamRef.current = activeCam;
            return;
        }

        console.log('📍 Previous video currentTime:', prevVideo.currentTime);
        console.log('📏 Previous video duration:', prevVideo.duration);
        console.log('📊 Previous video readyState:', prevVideo.readyState);
        console.log('🌐 Previous video networkState:', prevVideo.networkState);
        console.log('⏸️  Was playing:', !prevVideo.paused);
        console.log('---');
        console.log('📏 New video duration:', newVideo.duration);
        console.log('📊 New video readyState:', newVideo.readyState);
        console.log('🌐 New video networkState:', newVideo.networkState);
        console.log('📍 New video BEFORE sync:', newVideo.currentTime);

        // Store state
        const targetTime = prevVideo.currentTime;
        const wasPlaying = !prevVideo.paused;

        console.log('🎯 Target timestamp to sync:', targetTime);

        // Pause old video
        prevVideo.pause();

        // Sync new video to same timestamp with DETAILED LOGGING + FIX
        if (newVideo.readyState >= 1) {
            // Video is ready - instant switch!
            const adjustedTargetTime = Math.min(targetTime, newVideo.duration || targetTime);

            console.log('⚡ Video already ready (readyState:', newVideo.readyState, ')');
            console.log('🎯 Adjusted target time:', adjustedTargetTime, '(capped to duration)');
            console.log('📍 Setting currentTime from', newVideo.currentTime, 'to', adjustedTargetTime);

            // FIX: Use 'seeked' event to wait for seek to complete
            let seekTimeout: NodeJS.Timeout | null = null;

            const handleSeeked = () => {
                // Clear timeout if seek completed naturally
                if (seekTimeout) clearTimeout(seekTimeout);

                console.log('✅ Seek completed! (seeked event fired)');
                console.log('📍 New video currentTime AFTER seek:', newVideo.currentTime);
                console.log('❓ Difference from target:', Math.abs(newVideo.currentTime - adjustedTargetTime).toFixed(3), 'seconds');

                if (Math.abs(newVideo.currentTime - adjustedTargetTime) > 0.5) {
                    console.error('🚨 TIMESTAMP SYNC FAILED! Difference > 0.5s');
                    console.error('   Expected:', adjustedTargetTime);
                    console.error('   Got:', newVideo.currentTime);
                    console.error('   Attempting correction...');

                    // Try again
                    newVideo.currentTime = adjustedTargetTime;
                }

                // Update parent ref to point to new video
                // @ts-ignore
                videoRef.current = newVideo;

                // Resume playback if it was playing
                if (wasPlaying) {
                    newVideo.play().then(() => {
                        setIsPlaying(true);
                        const switchEndTime = performance.now();
                        console.log('▶️  Playback resumed');
                        console.log('⏱️  Total switch time:', (switchEndTime - switchStartTime).toFixed(2), 'ms');
                        console.log('📍 Final video time after resume:', newVideo.currentTime);
                        console.log('🎥 [CAMERA SWITCH + TIMESTAMP SYNC DEBUG] ===========================\n');
                    }).catch(err => {
                        console.warn('❌ Failed to resume playback:', err);
                        setIsPlaying(false);
                    });
                } else {
                    setIsPlaying(false);
                    const switchEndTime = performance.now();
                    console.log('⏸️  Staying paused');
                    console.log('⏱️  Total switch time:', (switchEndTime - switchStartTime).toFixed(2), 'ms');
                    console.log('📍 Final video time (paused):', newVideo.currentTime);
                    console.log('🎥 [CAMERA SWITCH + TIMESTAMP SYNC DEBUG] ===========================\n');
                }
            };

            // Listen for seeked event (seek completion)
            newVideo.addEventListener('seeked', handleSeeked, { once: true });

            // Set the time (will trigger seek)
            newVideo.currentTime = adjustedTargetTime;

            // Fallback: if seeked doesn't fire within 500ms, proceed anyway
            seekTimeout = setTimeout(() => {
                console.warn('⚠️  Seeked event timeout - proceeding anyway');
                newVideo.removeEventListener('seeked', handleSeeked);
                handleSeeked(); // Call it manually
            }, 500);
        } else {
            // Video not ready yet - wait for it
            console.log('⏳ Video not ready (readyState:', newVideo.readyState, '), waiting for canplay...');
            setIsSwitchingCamera(true);

            const handleCanPlay = () => {
                console.log('✅ canplay event fired - video ready now');
                console.log('📊 New readyState:', newVideo.readyState);

                const adjustedTargetTime = Math.min(targetTime, newVideo.duration || targetTime);
                console.log('🎯 Setting currentTime to:', adjustedTargetTime);

                // FIX: Use seeked event here too
                let delayedSeekTimeout: NodeJS.Timeout | null = null;

                const handleDelayedSeeked = () => {
                    // Clear timeout if seek completed naturally
                    if (delayedSeekTimeout) clearTimeout(delayedSeekTimeout);

                    console.log('✅ Seek completed (delayed path)!');
                    console.log('📍 New video currentTime AFTER delayed seek:', newVideo.currentTime);
                    console.log('❓ Difference from target:', Math.abs(newVideo.currentTime - adjustedTargetTime).toFixed(3), 'seconds');

                    if (Math.abs(newVideo.currentTime - adjustedTargetTime) > 0.5) {
                        console.error('🚨 TIMESTAMP SYNC FAILED (delayed path)!');
                        console.error('   Expected:', adjustedTargetTime);
                        console.error('   Got:', newVideo.currentTime);
                        console.error('   Attempting correction...');
                        newVideo.currentTime = adjustedTargetTime;
                    }

                    // @ts-ignore
                    videoRef.current = newVideo;

                    if (wasPlaying) {
                        newVideo.play().then(() => {
                            setIsPlaying(true);
                            setIsSwitchingCamera(false);
                            const switchEndTime = performance.now();
                            console.log('⏱️  Total switch time (delayed):', (switchEndTime - switchStartTime).toFixed(2), 'ms');
                            console.log('🎥 [CAMERA SWITCH + TIMESTAMP SYNC DEBUG] ===========================\n');
                        }).catch(err => {
                            console.warn('❌ Failed to resume playback:', err);
                            setIsPlaying(false);
                            setIsSwitchingCamera(false);
                        });
                    } else {
                        setIsPlaying(false);
                        setIsSwitchingCamera(false);
                        const switchEndTime = performance.now();
                        console.log('⏱️  Total switch time (delayed):', (switchEndTime - switchStartTime).toFixed(2), 'ms');
                        console.log('🎥 [CAMERA SWITCH + TIMESTAMP SYNC DEBUG] ===========================\n');
                    }
                };

                // Listen for seeked event
                newVideo.addEventListener('seeked', handleDelayedSeeked, { once: true });

                // Set the time
                newVideo.currentTime = adjustedTargetTime;

                // Fallback timeout
                delayedSeekTimeout = setTimeout(() => {
                    console.warn('⚠️  Seeked event timeout (delayed path) - proceeding anyway');
                    newVideo.removeEventListener('seeked', handleDelayedSeeked);
                    handleDelayedSeeked();
                }, 500);
            };

            newVideo.addEventListener('canplay', handleCanPlay, { once: true });
        }

        // Update previous cam ref
        previousCamRef.current = activeCam;

        // Reset zoom/pan
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [activeCam, videoRef]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Calculate percentage from mouse position on progress bar
    const getProgressFromPosition = (clientX: number, progressBar: HTMLElement): number => {
        const rect = progressBar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        return (clickX / rect.width) * 100;
    };

    // Calculate time from percentage
    const getTimeFromProgress = (progressPercent: number): number => {
        const video = videoRef.current;
        if (!video || !video.duration) return 0;
        return (progressPercent / 100) * video.duration;
    };

    // Handle mouse down to start dragging (seeking)
    const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Prevent bubbling to pan handlers
        const video = videoRef.current;
        if (!video) return;

        setIsDragging(true);

        // Immediately update visual progress for responsiveness
        const newProgress = getProgressFromPosition(e.clientX, e.currentTarget);
        setVisualProgress(newProgress);

        // Start debounced seeking
        if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current);
        }
        seekTimeoutRef.current = setTimeout(() => {
            video.currentTime = getTimeFromProgress(newProgress);
        }, 50);
    };

    // Handle dragging (seeking) - YouTube-style smooth slider
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const progressBar = document.querySelector('.progress-bar-container') as HTMLElement;
            if (!progressBar) return;

            // Update visual progress immediately (smooth thumb movement)
            const newProgress = getProgressFromPosition(e.clientX, progressBar);
            setVisualProgress(newProgress);

            // Debounce actual video seeking to reduce jankiness
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }
            seekTimeoutRef.current = setTimeout(() => {
                const video = videoRef.current;
                if (video && video.duration) {
                    video.currentTime = getTimeFromProgress(newProgress);
                }
            }, 50); // 50ms debounce for seeking during drag
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!isDragging) return;

            // Clear any pending debounced seek
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }

            // Perform final seek immediately on mouse release
            const progressBar = document.querySelector('.progress-bar-container') as HTMLElement;
            if (progressBar && videoRef.current) {
                const finalProgress = getProgressFromPosition(e.clientX, progressBar);
                setVisualProgress(finalProgress);
                videoRef.current.currentTime = getTimeFromProgress(finalProgress);
            }

            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, videoRef]);

    // Cleanup seek timeout on unmount
    useEffect(() => {
        return () => {
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }
        };
    }, []);

    // Zoom Handlers
    const handleWheel = (e: React.WheelEvent) => {
        // Only zoom if zoom mode is enabled
        if (!zoomModeEnabled) return;

        // Prevent default scroll behavior when zooming
        e.preventDefault();

        // Simple logic: scroll up to zoom in, scroll down to zoom out
        const zoomSpeed = 0.1;
        const newZoom = Math.max(1, Math.min(3, zoom - Math.sign(e.deltaY) * zoomSpeed));

        if (newZoom !== zoom) {
            setZoom(newZoom);
            // If zooming out to 1x, reset pan
            if (newZoom === 1) {
                setPan({ x: 0, y: 0 });
            }
        }
    };

    // Pan Handlers
    const handleVideoMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            e.preventDefault();
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        } else {
            // If not zoomed, maybe toggle play? Or just let standard click handler work?
            // The standard click handler is on the video element `onClick={togglePlay}`.
            // We might need to be careful here.
            // If we are zoomed in, we want to PAN, not toggle play.
        }
    };

    const handleVideoMouseMove = (e: React.MouseEvent) => {
        if (isPanning && zoom > 1) {
            e.preventDefault();
            const newX = e.clientX - startPan.x;
            const newY = e.clientY - startPan.y;

            // Optional: Constrain pan to keep video in view?
            // For now, let's just allow free pan but maybe limit it slightly?
            // A simple unconstrained pan is easiest for v1.
            setPan({ x: newX, y: newY });
        }
    };

    const handleVideoMouseUp = () => {
        setIsPanning(false);
    };

    const handleVideoClick = (e: React.MouseEvent) => {
        // Only toggle play if we weren't panning
        if (zoom === 1 && !isPanning) {
            togglePlay();
        }
    };

    // Update playback rate
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate, videoRef]);

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
    };

    const skipBackward = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skipDuration);
        }
    };

    const skipForward = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + skipDuration);
        }
    };

    // Frame-by-frame navigation
    const frameDuration = 1 / fps;

    const stepFrameForward = () => {
        if (videoRef.current) {
            // Pause video when stepping frames for precision
            if (!videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
            videoRef.current.currentTime = Math.min(
                videoRef.current.duration,
                videoRef.current.currentTime + frameDuration
            );
        }
    };

    const stepFrameBackward = () => {
        if (videoRef.current) {
            // Pause video when stepping frames for precision
            if (!videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
            videoRef.current.currentTime = Math.max(
                0,
                videoRef.current.currentTime - frameDuration
            );
        }
    };

    const formatTime = (seconds: number): string => {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
        if (newVolume === 0) {
            setIsMuted(true);
        } else if (isMuted) {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            videoRef.current.muted = newMutedState;
        }
    };

    const getVolumeIcon = () => {
        if (isMuted || volume === 0) return <VolumeX size={20} />;
        if (volume < 0.5) return <Volume1 size={20} />;
        return <Volume2 size={20} />;
    };

    const handleSkipDurationChange = (duration: number) => {
        setSkipDuration(duration);
        setCustomSkipInput(duration.toString());
    };

    // Get available cameras (only those with video sources)
    const availableCameras = React.useMemo(() => {
        if (!videoSources) return [];

        const cameras: string[] = [];
        if (videoSources.cam1) cameras.push('CAM 1');
        if (videoSources.cam2) cameras.push('CAM 2');
        if (videoSources.cam3) cameras.push('CAM 3');

        console.log('[VIDEO DEBUG] Available cameras:', cameras);

        return cameras;
    }, [videoSources]);

    // Helper to get loading state for a camera
    const getCameraLoadingState = (cam: string): 'loading' | 'ready' | 'error' | 'idle' => {
        switch (cam) {
            case 'CAM 1': return videoLoadingState.cam1;
            case 'CAM 2': return videoLoadingState.cam2;
            case 'CAM 3': return videoLoadingState.cam3;
            default: return 'idle';
        }
    };

    // Get loading indicator icon
    const getCameraIcon = (cam: string) => {
        const state = getCameraLoadingState(cam);
        switch (state) {
            case 'loading':
                return <Loader2 size={12} className="animate-spin text-yellow-500" />;
            case 'ready':
                return <div className="w-2 h-2 rounded-full bg-green-500" />;
            case 'error':
                return <div className="w-2 h-2 rounded-full bg-red-500" />;
            default:
                return <div className="w-2 h-2 rounded-full bg-gray-500" />;
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Camera Tabs & Size Controls */}
            <div className="flex items-center justify-between">
                {/* Camera Tabs - Only show available cameras */}
                {availableCameras.length > 0 && (
                    <div className="flex items-center gap-1">
                        {availableCameras.map((cam) => (
                            <button
                                key={cam}
                                onClick={() => setActiveCam(cam)}
                                disabled={getCameraLoadingState(cam) === 'loading'}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${activeCam === cam
                                    ? 'bg-surface text-accent-primary border-t border-x border-border'
                                    : 'text-foreground-secondary hover:text-foreground hover:bg-white/5'
                                    } ${getCameraLoadingState(cam) === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {getCameraIcon(cam)}
                                {cam}
                            </button>
                        ))}
                    </div>
                )}

                {/* Video Size Controls */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-secondary mr-1">Size:</span>
                    <div className="flex bg-surface border border-border rounded-lg p-0.5">
                        {(['small', 'medium', 'large'] as VideoSize[]).map((size) => (
                            <button
                                key={size}
                                onClick={() => setVideoSize(size)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${videoSize === size
                                    ? 'bg-accent-primary text-white'
                                    : 'text-foreground-secondary hover:text-foreground hover:bg-white/5'
                                    }`}
                                title={`${size.charAt(0).toUpperCase() + size.slice(1)} video`}
                            >
                                {sizeConfig[size].label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Video Container */}
            <div
                className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border group mx-auto w-full transition-all duration-300"
                style={{ maxWidth: sizeConfig[videoSize].maxWidth }}
                onWheel={handleWheel}
                onMouseLeave={handleVideoMouseUp}
            >
                {/* Loading Overlay */}
                {isSwitchingCamera && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={40} className="animate-spin text-accent-primary" />
                            <p className="text-white text-sm font-medium">Loading camera...</p>
                        </div>
                    </div>
                )}

                <div
                    className="w-full h-full overflow-hidden"
                    style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
                >
                    {/* RENDER ALL VIDEOS - Only show active one */}
                    {videoSources?.cam1 && (
                        <video
                            ref={cam1Ref}
                            src={videoSources.cam1}
                            className="w-full h-full object-contain absolute inset-0"
                            style={{
                                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                                display: activeCam === 'CAM 1' ? 'block' : 'none',
                            }}
                            preload="auto"
                            onEnded={() => setIsPlaying(false)}
                            onClick={handleVideoClick}
                            onMouseDown={handleVideoMouseDown}
                            onMouseMove={handleVideoMouseMove}
                            onMouseUp={handleVideoMouseUp}
                        />
                    )}
                    {videoSources?.cam2 && (
                        <video
                            ref={cam2Ref}
                            src={videoSources.cam2}
                            className="w-full h-full object-contain absolute inset-0"
                            style={{
                                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                                display: activeCam === 'CAM 2' ? 'block' : 'none',
                            }}
                            preload="auto"
                            onEnded={() => setIsPlaying(false)}
                            onClick={handleVideoClick}
                            onMouseDown={handleVideoMouseDown}
                            onMouseMove={handleVideoMouseMove}
                            onMouseUp={handleVideoMouseUp}
                        />
                    )}
                    {videoSources?.cam3 && (
                        <video
                            ref={cam3Ref}
                            src={videoSources.cam3}
                            className="w-full h-full object-contain absolute inset-0"
                            style={{
                                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                                display: activeCam === 'CAM 3' ? 'block' : 'none',
                            }}
                            preload="auto"
                            onEnded={() => setIsPlaying(false)}
                            onClick={handleVideoClick}
                            onMouseDown={handleVideoMouseDown}
                            onMouseMove={handleVideoMouseMove}
                            onMouseUp={handleVideoMouseUp}
                        />
                    )}
                </div>

                {/* Controls Overlay (Visible on Hover) */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    {/* Progress Bar */}
                    <div
                        className="progress-bar-container w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer hover:h-1.5 transition-all"
                        onMouseDown={handleSeekMouseDown}
                    >
                        <div
                            className="h-full bg-accent-primary rounded-full relative"
                            style={{
                                width: `${isDragging ? visualProgress : progress}%`,
                                transition: isDragging ? 'none' : 'width 0.1s ease-out'
                            }}
                        >
                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-transform ${isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100'}`}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={togglePlay}
                                className="text-white hover:text-accent-primary transition-colors"
                            >
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                            </button>

                            <div className="flex items-center gap-2">
                                {/* Time Skip Controls */}
                                <button
                                    onClick={skipBackward}
                                    className="text-white/70 hover:text-white transition-colors"
                                    title={`Skip back ${skipDuration}s`}
                                >
                                    <SkipBack size={20} />
                                </button>
                                <button
                                    onClick={skipForward}
                                    className="text-white/70 hover:text-white transition-colors"
                                    title={`Skip forward ${skipDuration}s`}
                                >
                                    <SkipForward size={20} />
                                </button>

                                {/* Frame Step Divider */}
                                <div className="w-px h-4 bg-white/20 mx-1"></div>

                                {/* Frame Step Controls */}
                                <button
                                    onClick={stepFrameBackward}
                                    className="text-white/70 hover:text-white transition-colors flex items-center gap-0.5"
                                    title="Previous frame (← Arrow)"
                                >
                                    <ChevronDown size={16} />
                                    <span className="text-[10px] font-mono">1f</span>
                                </button>
                                <button
                                    onClick={stepFrameForward}
                                    className="text-white/70 hover:text-white transition-colors flex items-center gap-0.5"
                                    title="Next frame (→ Arrow)"
                                >
                                    <ChevronUp size={16} />
                                    <span className="text-[10px] font-mono">1f</span>
                                </button>
                            </div>

                            <div className="text-xs font-mono text-white/70">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Zoom Indicator/Reset */}
                            {zoom > 1 && (
                                <button
                                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                                    className="text-xs bg-accent-primary text-white px-2 py-1 rounded hover:bg-accent-primary/90 transition-colors"
                                >
                                    Reset Zoom ({Math.round(zoom * 100)}%)
                                </button>
                            )}

                            {/* Volume Control */}
                            <div
                                className="relative flex items-center gap-2"
                                onMouseEnter={() => setShowVolumeSlider(true)}
                                onMouseLeave={() => setShowVolumeSlider(false)}
                            >
                                <button
                                    onClick={toggleMute}
                                    className="text-white/70 hover:text-white transition-colors"
                                    title={isMuted ? "Unmute" : "Mute"}
                                >
                                    {getVolumeIcon()}
                                </button>

                                {/* Volume Slider */}
                                <div
                                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 rounded-lg p-3 transition-all duration-200 ${showVolumeSlider ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                                        }`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolumeChange}
                                        className="h-24 w-1 appearance-none bg-white/20 rounded-full cursor-pointer [writing-mode:vertical-lr] direction-rtl"
                                        style={{
                                            background: `linear-gradient(to top, var(--accent-primary) 0%, var(--accent-primary) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                                        }}
                                    />

                                    {/* Mute/Unmute button below slider */}
                                    <button
                                        onClick={toggleMute}
                                        className="mt-2 text-white/70 hover:text-white transition-colors text-xs"
                                        title={isMuted ? "Unmute" : "Mute"}
                                    >
                                        {isMuted ? "Unmute" : "Mute"}
                                    </button>
                                </div>
                            </div>

                            {/* Zoom Mode Toggle */}
                            <button
                                onClick={() => {
                                    setZoomModeEnabled(!zoomModeEnabled);
                                    // If disabling zoom mode, reset zoom
                                    if (zoomModeEnabled) {
                                        setZoom(1);
                                        setPan({ x: 0, y: 0 });
                                    }
                                }}
                                className={`px-3 py-1 text-xs rounded transition-colors ${zoomModeEnabled
                                    ? 'bg-accent-primary text-white'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                                    }`}
                                title={zoomModeEnabled ? "Disable Zoom Mode" : "Enable Zoom Mode"}
                            >
                                {zoomModeEnabled ? '🔍 Zoom: ON' : '🔍 Zoom: OFF'}
                            </button>

                            {/* Settings Button & Modal */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSettingsModal(!showSettingsModal)}
                                    className="text-white/70 hover:text-white transition-colors"
                                    title="Settings"
                                >
                                    <Settings size={20} />
                                </button>

                                {/* Settings Modal */}
                                {showSettingsModal && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-4 min-w-[240px] border border-white/10">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-medium text-white">Skip Duration</h4>
                                            <button
                                                onClick={() => setShowSettingsModal(false)}
                                                className="text-white/50 hover:text-white text-xs"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Preset Buttons */}
                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                            {[1, 5, 10, 30].map((duration) => (
                                                <button
                                                    key={duration}
                                                    onClick={() => handleSkipDurationChange(duration)}
                                                    className={`px-2 py-1.5 text-xs rounded transition-colors ${skipDuration === duration
                                                        ? 'bg-accent-primary text-white'
                                                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                                                        }`}
                                                >
                                                    {duration}s
                                                </button>
                                            ))}
                                        </div>

                                        {/* Custom Input */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/70">Custom (seconds)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="0.1"
                                                    step="0.1"
                                                    value={customSkipInput}
                                                    onChange={(e) => setCustomSkipInput(e.target.value)}
                                                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent-primary"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const value = parseFloat(customSkipInput);
                                                        if (!isNaN(value) && value > 0) {
                                                            setSkipDuration(value);
                                                        }
                                                    }}
                                                    className="px-3 py-1 bg-accent-primary text-white text-xs rounded hover:bg-accent-primary/90 transition-colors"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Playback Speed Control */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                    className="text-white/70 hover:text-white transition-colors flex items-center gap-1"
                                    title="Playback Speed"
                                >
                                    <Gauge size={20} />
                                    <span className="text-xs font-mono w-8">{playbackRate}x</span>
                                </button>

                                {/* Speed Menu */}
                                {showSpeedMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden min-w-[100px] flex flex-col-reverse">
                                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                            <button
                                                key={rate}
                                                onClick={() => handleSpeedChange(rate)}
                                                className={`px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${playbackRate === rate ? 'text-accent-primary font-bold' : 'text-white/70'
                                                    }`}
                                            >
                                                {rate}x
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
