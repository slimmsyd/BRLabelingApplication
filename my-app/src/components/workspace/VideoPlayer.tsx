import React, { useState, useEffect, RefObject } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, Volume2, VolumeX, Volume1, Settings, Gauge, ChevronUp, ChevronDown } from 'lucide-react';

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

const VideoPlayer = ({ videoRef, activeCam, setActiveCam, videoSources, fps = 30 }: VideoPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
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

    // Video size state
    const [videoSize, setVideoSize] = useState<VideoSize>('large');

    // Video size configurations
    const sizeConfig = {
        small: { maxWidth: '480px', label: 'S' },
        medium: { maxWidth: '720px', label: 'M' },
        large: { maxWidth: '100%', label: 'L' },
    };

    // Update progress as video plays
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            setCurrentTime(video.currentTime);
            setProgress((video.currentTime / video.duration) * 100 || 0);
        };

        const updateDuration = () => {
            setDuration(video.duration);
        };

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', updateDuration);

        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('loadedmetadata', updateDuration);
        };
    }, [videoRef]);

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

    // Reset zoom when camera changes
    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [activeCam]);

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

    // Calculate time from mouse position on progress bar
    const getTimeFromPosition = (clientX: number, progressBar: HTMLElement): number => {
        const video = videoRef.current;
        if (!video) return 0;

        const rect = progressBar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;
        return percentage * video.duration;
    };

    // Handle mouse down to start dragging (seeking)
    const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Prevent bubbling to pan handlers
        const video = videoRef.current;
        if (!video) return;

        setIsDragging(true);
        const newTime = getTimeFromPosition(e.clientX, e.currentTarget);
        video.currentTime = newTime;
    };

    // Handle dragging (seeking)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !videoRef.current) return;

            const progressBar = document.querySelector('.progress-bar-container') as HTMLElement;
            if (!progressBar) return;

            const newTime = getTimeFromPosition(e.clientX, progressBar);
            videoRef.current.currentTime = newTime;
        };

        const handleMouseUp = () => {
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

    // Get current video source based on active camera
    const getCurrentVideoSrc = (): string | undefined => {
        if (!videoSources) return undefined;

        switch (activeCam) {
            case 'CAM 1':
                return videoSources.cam1;
            case 'CAM 2':
                return videoSources.cam2;
            case 'CAM 3':
                return videoSources.cam3;
            default:
                return videoSources.cam1;
        }
    };

    // Get available cameras (only those with video sources)
    const availableCameras = React.useMemo(() => {
        if (!videoSources) return [];

        const cameras: string[] = [];
        if (videoSources.cam1) cameras.push('CAM 1');
        if (videoSources.cam2) cameras.push('CAM 2');
        if (videoSources.cam3) cameras.push('CAM 3');

        return cameras;
    }, [videoSources]);

    const currentVideoSrc = getCurrentVideoSrc();

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
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeCam === cam
                                    ? 'bg-surface text-accent-primary border-t border-x border-border'
                                    : 'text-foreground-secondary hover:text-foreground hover:bg-white/5'
                                    }`}
                            >
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
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                    videoSize === size
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
                <div
                    className="w-full h-full overflow-hidden"
                    style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
                >
                    <video
                        ref={videoRef}
                        src={currentVideoSrc || ''}
                        className="w-full h-full object-contain"
                        style={{
                            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                        }}
                        onEnded={() => setIsPlaying(false)}
                        onClick={handleVideoClick}
                        onMouseDown={handleVideoMouseDown}
                        onMouseMove={handleVideoMouseMove}
                        onMouseUp={handleVideoMouseUp}
                    />
                </div>

                {/* Controls Overlay (Visible on Hover) */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    {/* Progress Bar */}
                    <div
                        className="progress-bar-container w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer hover:h-1.5 transition-all"
                        onMouseDown={handleSeekMouseDown}
                    >
                        <div
                            className="h-full bg-accent-primary rounded-full relative transition-all"
                            style={{ width: `${progress}%` }}
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
