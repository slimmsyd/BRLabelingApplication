import React from 'react';
import { Check } from 'lucide-react';

interface SidebarControlsProps {
    onLogEvent: (eventData: any) => void;
    getCurrentTime: () => string;
    formState: {
        boxer: string;
        startTime: string;
        endTime: string;
        punchType: string;
        hand: string;
        target: string;
        visibilityFlags: string[];
        knockdown: boolean;
        punchQuality: string;
    };
    setFormState: {
        setBoxer: (val: string) => void;
        setStartTime: (val: string) => void;
        setEndTime: (val: string) => void;
        setPunchType: (val: string) => void;
        setHand: (val: string) => void;
        setTarget: (val: string) => void;
        setVisibilityFlags: (val: string[]) => void;
        setKnockdown: (val: boolean) => void;
        setPunchQuality: (val: string) => void;
    };
    activeTimeMode: 'start' | 'end';
    setActiveTimeMode: (mode: 'start' | 'end') => void;
    activeCam: string;
}

const SidebarControls = ({ onLogEvent, getCurrentTime, formState, setFormState, activeTimeMode, setActiveTimeMode, activeCam }: SidebarControlsProps) => {
    const { boxer, startTime, endTime, punchType, hand, target, visibilityFlags, knockdown, punchQuality } = formState;
    const { setBoxer, setStartTime, setEndTime, setPunchType, setHand, setTarget, setVisibilityFlags, setKnockdown, setPunchQuality } = setFormState;

    const parseTime = (timeStr: string): number => {
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

    const isTimeInvalid = startTime && endTime && parseTime(startTime) > parseTime(endTime);

    const handleUseCurrentTime = () => {
        const time = getCurrentTime();
        if (activeTimeMode === 'start') {
            setStartTime(time);
        } else {
            setEndTime(time);
        }
    };

    const toggleFlag = (flag: string) => {
        if (visibilityFlags.includes(flag)) {
            setVisibilityFlags(visibilityFlags.filter(f => f !== flag));
        } else {
            setVisibilityFlags([...visibilityFlags, flag]);
        }
    };

    const handleLogEvent = () => {
        // If times are empty, try to grab current time
        const currentT = getCurrentTime();
        const finalStart = startTime || currentT;
        const finalEnd = endTime || currentT;

        // Generate details string including visibility flags if any
        let detailsStr = `${punchType} (${hand === 'Left' ? 'L' : 'R'}) - ${target}`;
        if (visibilityFlags.length > 0) {
            detailsStr += ` [${visibilityFlags.join(', ')}]`;
        }

        const newEvent = {
            boxer,
            startTime: finalStart,
            endTime: finalEnd,
            punchType,
            hand,
            target,
            visibilityFlags,
            knockdown,
            punchQuality,
            details: detailsStr,
            cam: activeCam
        };
        onLogEvent(newEvent);

        // Reset times handled by parent now, but we can double check logic if needed.
        // Parent resets times, so we don't need to do it here.
    };

    const handleCancel = () => {
        setBoxer('Boxer A');
        setStartTime('');
        setEndTime('');
        setPunchType('Jab');
        setHand('Left');
        setTarget('Head');
        setVisibilityFlags([]);
        setKnockdown(false);
        setPunchQuality('1');
        setActiveTimeMode('start');
    };

    return (
        <div className="flex flex-col h-full gap-6">

            {/* Log New Event Form */}
            <div className="bg-surface rounded-xl border border-border p-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-foreground">Log New Event</h3>
                    <button
                        onClick={handleUseCurrentTime}
                        className="text-xs text-accent-primary hover:underline cursor-pointer"
                    >
                        Use Current Time
                    </button>
                </div>

                <div className="space-y-4 mb-4">
                    {/* Section 1: Basic Info */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Boxer</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setBoxer('Boxer A')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${boxer === 'Boxer A' ? 'bg-accent-primary text-white' : 'bg-background border border-border text-foreground-secondary hover:text-foreground'}`}
                                >
                                    Boxer A
                                </button>
                                <button
                                    onClick={() => setBoxer('Boxer B')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${boxer === 'Boxer B' ? 'bg-accent-primary text-white' : 'bg-background border border-border text-foreground-secondary hover:text-foreground'}`}
                                >
                                    Boxer B
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div
                                className={`p-2 rounded-lg border transition-colors cursor-pointer ${activeTimeMode === 'start' ? 'bg-accent-primary/10 border-accent-primary' : 'border-transparent hover:bg-white/5'} ${isTimeInvalid ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''}`}
                                onClick={() => setActiveTimeMode('start')}
                            >
                                <label className={`block text-xs font-medium mb-1.5 cursor-pointer ${activeTimeMode === 'start' ? 'text-accent-primary' : 'text-foreground-secondary'} ${isTimeInvalid ? 'text-red-500' : ''}`}>Start Time</label>
                                <input
                                    type="text"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className={`w-full bg-background border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-accent-primary ${activeTimeMode === 'start' ? 'border-accent-primary' : 'border-border'} ${isTimeInvalid ? 'border-red-500' : ''}`}
                                />
                            </div>
                            <div
                                className={`p-2 rounded-lg border transition-colors cursor-pointer ${activeTimeMode === 'end' ? 'bg-accent-primary/10 border-accent-primary' : 'border-transparent hover:bg-white/5'} ${isTimeInvalid ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''}`}
                                onClick={() => setActiveTimeMode('end')}
                            >
                                <label className={`block text-xs font-medium mb-1.5 cursor-pointer ${activeTimeMode === 'end' ? 'text-accent-primary' : 'text-foreground-secondary'} ${isTimeInvalid ? 'text-red-500' : ''}`}>End Time</label>
                                <input
                                    type="text"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className={`w-full bg-background border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-accent-primary ${activeTimeMode === 'end' ? 'border-accent-primary' : 'border-border'} ${isTimeInvalid ? 'border-red-500' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Classification */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Punch Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Jab', 'Cross', 'Hook', 'Uppercut'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setPunchType(type)}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${punchType === type
                                            ? 'bg-accent-primary text-white'
                                            : 'bg-background border border-border text-foreground-secondary hover:text-foreground hover:border-foreground-secondary'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Punch Quality</label>
                            <div className="flex gap-2">
                                {['1', '2'].map((quality) => (
                                    <button
                                        key={quality}
                                        onClick={() => setPunchQuality(quality)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${punchQuality === quality
                                            ? 'bg-accent-primary text-white'
                                            : 'bg-background border border-border text-foreground-secondary hover:text-foreground hover:border-foreground-secondary'
                                            }`}
                                    >
                                        {quality}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Hand</label>
                                <div className="flex bg-background rounded-lg p-1 border border-border">
                                    <button
                                        onClick={() => setHand('Left')}
                                        className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${hand === 'Left' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                    >
                                        Left
                                    </button>
                                    <button
                                        onClick={() => setHand('Right')}
                                        className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${hand === 'Right' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                    >
                                        Right
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Target</label>
                                <div className="flex bg-background rounded-lg p-1 border border-border">
                                    <button
                                        onClick={() => setTarget('Head')}
                                        className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${target === 'Head' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                    >
                                        Head
                                    </button>
                                    <button
                                        onClick={() => setTarget('Body')}
                                        className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${target === 'Body' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                    >
                                        Body
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visibility Flags - Larger and Clickable */}
                <div className="mb-6">
                    <label className="block text-xs font-medium text-foreground-secondary mb-3">Visibility</label>
                    <div className="flex flex-col gap-2">
                        {['Full Body', 'Profile', 'Origin', 'Trajectory', 'Impact'].map((flag) => {
                            const isSelected = visibilityFlags.includes(flag);
                            return (
                                <label
                                    key={flag}
                                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected
                                        ? 'bg-accent-primary/10 border-accent-primary'
                                        : 'bg-background border-border hover:border-foreground-secondary'
                                        }`}
                                    onClick={() => toggleFlag(flag)}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent-primary border-accent-primary' : 'border-foreground-secondary'
                                        }`}>
                                        {isSelected && <Check size={14} className="text-white" />}
                                    </div>
                                    <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground-secondary'}`}>
                                        {flag}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Knockdown */}
                <div className="mb-6">
                    <label className="block text-xs font-medium text-foreground-secondary mb-3">Knockdown</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setKnockdown(false)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${!knockdown
                                ? 'bg-accent-primary text-white'
                                : 'bg-background border border-border text-foreground-secondary hover:text-foreground hover:border-foreground-secondary'
                                }`}
                        >
                            NO
                        </button>
                        <button
                            onClick={() => setKnockdown(true)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${knockdown
                                ? 'bg-red-500 text-white'
                                : 'bg-background border border-border text-foreground-secondary hover:text-foreground hover:border-foreground-secondary'
                                }`}
                        >
                            YES
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <button
                        onClick={handleLogEvent}
                        className={`flex-1 cursor-pointer py-3 bg-foreground text-black text-sm font-bold rounded-lg transition-colors shadow-lg shadow-white/5 ${isTimeInvalid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/90'}`}
                        disabled={isTimeInvalid || !isTimeInvalid && false}
                    >
                        Log Event
                    </button>
                    <button
                        onClick={handleCancel}
                        className="px-4 cursor-pointer py-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-medium rounded-lg hover:bg-red-500/20 hover:border-red-500 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidebarControls;
