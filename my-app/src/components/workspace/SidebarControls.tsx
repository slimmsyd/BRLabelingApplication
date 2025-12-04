import React from 'react';
import { Check, Clock, Plus } from 'lucide-react';

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
        stance: string;
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
        setStance: (val: string) => void;
    };
    activeTimeMode: 'start' | 'end';
    setActiveTimeMode: (mode: 'start' | 'end') => void;
    activeCam: string;
    readOnly?: boolean;
    isEditing?: boolean;
    onCancelEdit?: () => void;
    onUpdateEvent?: (eventData: any) => void;
}

const SidebarControls = ({
    onLogEvent,
    getCurrentTime,
    formState,
    setFormState,
    activeTimeMode,
    setActiveTimeMode,
    activeCam,
    readOnly = false,
    isEditing = false,
    onCancelEdit,
    onUpdateEvent
}: SidebarControlsProps) => {
    const { boxer, startTime, endTime, punchType, hand, target, visibilityFlags, knockdown, punchQuality, stance } = formState;
    const { setBoxer, setStartTime, setEndTime, setPunchType, setHand, setTarget, setVisibilityFlags, setKnockdown, setPunchQuality, setStance } = setFormState;

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

    const isTimeInvalid = Boolean(startTime && endTime && parseTime(startTime) > parseTime(endTime));

    const handleUseCurrentTime = () => {
        if (readOnly) return;
        const time = getCurrentTime();
        if (activeTimeMode === 'start') {
            setStartTime(time);
        } else {
            setEndTime(time);
        }
    };

    const toggleFlag = (flag: string) => {
        if (readOnly) return;
        if (visibilityFlags.includes(flag)) {
            setVisibilityFlags(visibilityFlags.filter(f => f !== flag));
        } else {
            setVisibilityFlags([...visibilityFlags, flag]);
        }
    };

    const handleAction = () => {
        if (readOnly) return;
        // If times are empty, try to grab current time
        const currentT = getCurrentTime();
        const finalStart = startTime || currentT;
        const finalEnd = endTime || currentT;

        // Generate details string including visibility flags if any
        let detailsStr = `${punchType} (${hand === 'Left' ? 'L' : 'R'}) - ${target} [${stance}]`;
        if (visibilityFlags.length > 0) {
            detailsStr += ` [${visibilityFlags.join(', ')}]`;
        }

        const eventData = {
            boxer,
            startTime: finalStart,
            endTime: finalEnd,
            punchType,
            hand,
            target,
            visibilityFlags,
            knockdown,
            punchQuality,
            stance,
            details: detailsStr,
            cam: activeCam
        };

        if (isEditing && onUpdateEvent) {
            onUpdateEvent(eventData);
        } else {
            onLogEvent(eventData);
        }
    };

    const handleCancel = () => {
        if (readOnly) return;
        setBoxer('Boxer A');
        setStartTime('');
        setEndTime('');
        setPunchType('Jab');
        setHand('Left');
        setTarget('Head');
        setVisibilityFlags([]);
        setKnockdown(false);
        setPunchQuality('1');
        setStance('Orthodox');
        setActiveTimeMode('start');

        if (isEditing && onCancelEdit) {
            onCancelEdit();
        }
    };

    return (
        <div className={`space-y-6 ${readOnly ? 'pointer-events-none' : ''}`}>
            {/* Timer Display */}
            <div className="bg-surface border border-border rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div
                        onClick={() => setActiveTimeMode('start')}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${activeTimeMode === 'start'
                            ? 'bg-accent-primary/10 border-accent-primary'
                            : 'bg-background border-border hover:border-foreground-secondary'
                            }`}
                    >
                        <div className={`text-xs font-medium mb-1 ${activeTimeMode === 'start' ? 'text-accent-primary' : 'text-foreground-secondary'}`}>
                            Start Time
                        </div>
                        <div className="text-sm font-mono font-bold text-foreground tracking-wider">
                            {startTime || '00:00.00'}
                        </div>
                    </div>
                    <div
                        onClick={() => setActiveTimeMode('end')}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${activeTimeMode === 'end'
                            ? 'bg-accent-primary/10 border-accent-primary'
                            : 'bg-background border-border hover:border-foreground-secondary'
                            }`}
                    >
                        <div className={`text-xs font-medium mb-1 ${activeTimeMode === 'end' ? 'text-accent-primary' : 'text-foreground-secondary'}`}>
                            End Time
                        </div>
                        <div className="text-sm font-mono font-bold text-foreground tracking-wider">
                            {endTime || '00:00.00'}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleUseCurrentTime}
                    disabled={readOnly}
                    className={`w-full py-3 bg-white/5 hover:bg-white/10 border border-border rounded-lg text-sm font-medium text-foreground transition-colors flex items-center justify-center gap-2 cursor-pointer ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Clock size={16} />
                    Use Current Time
                </button>
            </div>

            {/* Log New Event Form */}
            <div className="bg-surface rounded-xl border border-border p-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Plus size={16} className="text-accent-primary" />
                        {isEditing ? 'Update Event' : 'Log New Event'}
                    </h2>
                    <button
                        onClick={handleCancel}
                        disabled={readOnly}
                        className="text-xs text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        {isEditing ? 'Cancel Edit' : 'Reset Form'}
                    </button>
                </div>

                {/* Boxer Selection */}
                <div className="mb-4">
                    <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Boxer</label>
                    <div className="flex bg-background rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setBoxer('Boxer A')}
                            disabled={readOnly}
                            className={`flex-1 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${boxer === 'Boxer A' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                        >
                            Boxer A (Crawford)
                        </button>
                        <button
                            onClick={() => setBoxer('Boxer B')}
                            disabled={readOnly}
                            className={`flex-1 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${boxer === 'Boxer B' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                        >
                            Boxer B (Canelo)
                        </button>
                    </div>
                </div>

                {/* Stance Selection */}
                <div className="mb-4">
                    <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Stance</label>
                    <div className="flex bg-background rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setStance('Orthodox')}
                            disabled={readOnly}
                            className={`flex-1 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${stance === 'Orthodox' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                        >
                            Orthodox
                        </button>
                        <button
                            onClick={() => setStance('Southpaw')}
                            disabled={readOnly}
                            className={`flex-1 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${stance === 'Southpaw' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                        >
                            Southpaw
                        </button>
                    </div>
                </div>

                {/* Punch Type & Quality */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Punch Type</label>
                        <select
                            value={punchType}
                            onChange={(e) => setPunchType(e.target.value)}
                            disabled={readOnly}
                            className="w-full bg-background border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-accent-primary"
                        >
                            {['Jab', 'Cross', 'Hook', 'Uppercut', 'Overhand', 'Screwshot'].map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Quality (1-5)</label>
                        <select
                            value={punchQuality}
                            onChange={(e) => setPunchQuality(e.target.value)}
                            disabled={readOnly}
                            className="w-full bg-background border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-accent-primary"
                        >
                            {['1', '2'].map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Hand & Target */}
                <div className="mb-4">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-foreground-secondary mb-1.5">Hand</label>
                            <div className="flex bg-background rounded-lg p-1 border border-border">
                                <button
                                    onClick={() => setHand('Left')}
                                    disabled={readOnly}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${hand === 'Left' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                >
                                    Left
                                </button>
                                <button
                                    onClick={() => setHand('Right')}
                                    disabled={readOnly}
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
                                    disabled={readOnly}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${target === 'Head' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                >
                                    Head
                                </button>
                                <button
                                    onClick={() => setTarget('Body')}
                                    disabled={readOnly}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${target === 'Body' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                >
                                    Body
                                </button>
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
                            disabled={readOnly}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${!knockdown
                                ? 'bg-accent-primary text-white'
                                : 'bg-background border border-border text-foreground-secondary hover:text-foreground hover:border-foreground-secondary'
                                }`}
                        >
                            NO
                        </button>
                        <button
                            onClick={() => setKnockdown(true)}
                            disabled={readOnly}
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
                        onClick={handleAction}
                        disabled={readOnly || isTimeInvalid}
                        className={`flex-1 cursor-pointer py-3 text-sm font-bold rounded-lg transition-colors shadow-lg shadow-white/5 ${isTimeInvalid || readOnly
                            ? 'bg-foreground text-black opacity-50 cursor-not-allowed'
                            : isEditing
                                ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
                                : 'bg-foreground text-black hover:bg-white/90'}`}
                    >
                        {isEditing ? 'Update Event' : 'Log Event'}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={readOnly}
                        className={`px-4 cursor-pointer py-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-medium rounded-lg transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/20 hover:border-red-500'}`}
                    >
                        {isEditing ? 'Cancel' : 'Clear'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidebarControls;
