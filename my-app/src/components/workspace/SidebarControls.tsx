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
        landed: boolean;
        punchResult: string;
        defenseType: string;
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
        setLanded: (val: boolean) => void;
        setPunchResult: (val: string) => void;
        setDefenseType: (val: string) => void;
    };
    activeTimeMode: 'start' | 'end';
    setActiveTimeMode: (mode: 'start' | 'end') => void;
    activeCam: string;
    readOnly?: boolean;
    isEditing?: boolean;
    onCancelEdit?: () => void;
    onUpdateEvent?: (eventData: any) => void;
    boxerNames?: { boxerA: string; boxerB: string };
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
    onUpdateEvent,
    boxerNames
}: SidebarControlsProps) => {
    // Get display names for boxers (fallback to generic labels)
    const boxerAName = boxerNames?.boxerA || 'Boxer A';
    const boxerBName = boxerNames?.boxerB || 'Boxer B';
    const { boxer, startTime, endTime, punchType, hand, target, visibilityFlags, knockdown, punchQuality, stance, landed, punchResult, defenseType } = formState;
    const { setBoxer, setStartTime, setEndTime, setPunchType, setHand, setTarget, setVisibilityFlags, setKnockdown, setPunchQuality, setStance, setLanded, setPunchResult, setDefenseType } = setFormState;

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
            landed, // Deprecated but kept for compat
            punchResult,
            defenseType: punchResult === 'Defended' ? defenseType : undefined,
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
        setLanded(true);
        setPunchResult('Landed');
        setDefenseType('Guard');
        setActiveTimeMode('start');

        if (isEditing && onCancelEdit) {
            onCancelEdit();
        }
    };

    // Helper to determine if a hand is Lead or Rear based on Stance
    const getHandLabel = (side: 'Left' | 'Right') => {
        if (stance === 'Orthodox') {
            return side === 'Left' ? 'Lead (L)' : 'Rear (R)';
        } else {
            return side === 'Right' ? 'Lead (R)' : 'Rear (L)';
        }
    };

    return (
        <div className={`space-y-3 overflow-y-auto scrollbar-hide ${readOnly ? 'pointer-events-none' : ''}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Timer Display - Compacted */}
            <div className="bg-surface border border-border rounded-xl p-3">
                <div className="grid grid-cols-2 gap-3">
                    <div
                        onClick={() => setActiveTimeMode('start')}
                        className={`p-2 rounded-lg border cursor-pointer transition-all ${activeTimeMode === 'start'
                            ? 'bg-accent-primary/10 border-accent-primary'
                            : 'bg-background border-border hover:border-foreground-secondary'
                            }`}
                    >
                        <div className={`text-[10px] font-medium mb-0.5 ${activeTimeMode === 'start' ? 'text-accent-primary' : 'text-foreground-secondary'}`}>
                            Start Time
                        </div>
                        <div className="text-xs font-mono font-bold text-foreground tracking-wider">
                            {startTime || '00:00.00'}
                        </div>
                    </div>
                    <div
                        onClick={() => setActiveTimeMode('end')}
                        className={`p-2 rounded-lg border cursor-pointer transition-all ${activeTimeMode === 'end'
                            ? 'bg-accent-primary/10 border-accent-primary'
                            : 'bg-background border-border hover:border-foreground-secondary'
                            }`}
                    >
                        <div className={`text-[10px] font-medium mb-0.5 ${activeTimeMode === 'end' ? 'text-accent-primary' : 'text-foreground-secondary'}`}>
                            End Time
                        </div>
                        <div className="text-xs font-mono font-bold text-foreground tracking-wider">
                            {endTime || '00:00.00'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Log New Event Form */}
            <div className="bg-surface rounded-xl border border-border p-3 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {isEditing ? 'Update Event' : 'Log New Event'}
                    </h2>
                    <button
                        onClick={handleCancel}
                        disabled={readOnly}
                        className="text-[10px] text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        {isEditing ? 'Cancel Edit' : 'Reset'}
                    </button>
                </div>

                {/* Boxer & Stance - Combined Row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="block text-[10px] font-medium text-foreground-secondary mb-1">Boxer</label>
                        <div className="flex bg-background rounded-lg p-0.5 border border-border">
                            <button
                                onClick={() => setBoxer('Boxer A')}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer truncate px-1 ${boxer === 'Boxer A' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                title={boxerAName}
                            >
                                {boxerAName}
                            </button>
                            <button
                                onClick={() => setBoxer('Boxer B')}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer truncate px-1 ${boxer === 'Boxer B' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                title={boxerBName}
                            >
                                {boxerBName}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-foreground-secondary mb-1">Stance</label>
                        <div className="flex bg-background rounded-lg p-0.5 border border-border">
                            <button
                                onClick={() => setStance('Orthodox')}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${stance === 'Orthodox' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                            >
                                Orth
                            </button>
                            <button
                                onClick={() => setStance('Southpaw')}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${stance === 'Southpaw' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                            >
                                South
                            </button>
                        </div>
                    </div>
                </div>

                {/* Punch Result & Defense - Compact */}
                <div className="mb-3">
                    <label className="block text-[10px] font-medium text-foreground-secondary mb-1">Result</label>
                    <div className="flex gap-2">
                        <select
                            value={punchResult}
                            onChange={(e) => {
                                setPunchResult(e.target.value);
                                setLanded(e.target.value === 'Landed');
                            }}
                            disabled={readOnly}
                            className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-primary"
                        >
                            {['Landed', 'Missed', 'Unseen', 'Defended'].map(res => (
                                <option key={res} value={res}>{res}</option>
                            ))}
                        </select>
                        {punchResult === 'Defended' && (
                            <div className="flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                <select
                                    value={defenseType}
                                    onChange={(e) => setDefenseType(e.target.value)}
                                    disabled={readOnly}
                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-primary"
                                >
                                    {['Guard', 'Slip', 'Parry', 'Duck'].map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Punch Type & Quality - Compact */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-foreground-secondary mb-1">Type</label>
                        <select
                            value={punchType}
                            onChange={(e) => setPunchType(e.target.value)}
                            disabled={readOnly}
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-primary"
                        >
                            {['Jab', 'Cross', 'Hook', 'Uppercut', 'Overhand', 'Screwshot'].map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-foreground-secondary mb-1">Qual (1-2)</label>
                        <select
                            value={punchQuality}
                            onChange={(e) => setPunchQuality(e.target.value)}
                            disabled={punchResult !== 'Landed' || readOnly}
                            className={`w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-primary ${punchResult !== 'Landed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {['1', '2'].map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Hand & Target - Compact */}
                <div className="mb-3">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium text-foreground-secondary mb-1">Hand</label>
                            <div className="flex bg-background rounded-lg p-0.5 border border-border">
                                <button
                                    onClick={() => setHand('Left')}
                                    disabled={readOnly}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer truncate ${hand === 'Left' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                >
                                    {getHandLabel('Left')}
                                </button>
                                <button
                                    onClick={() => setHand('Right')}
                                    disabled={readOnly}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-colors cursor-pointer truncate ${hand === 'Right' ? 'bg-white/10 text-foreground' : 'text-foreground-secondary hover:text-foreground'}`}
                                >
                                    {getHandLabel('Right')}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-medium text-foreground-secondary mb-1">Target</label>
                            <div className="flex bg-background rounded-lg p-0.5 border border-border">
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

                {/* Visibility Flags - Compact Chips */}
                <div className="mb-3">
                    <label className="block text-[10px] font-medium text-foreground-secondary mb-1.5">Visibility</label>
                    <div className="flex flex-wrap gap-1.5">
                        {['Full Body', 'Forward/Profile', 'Origin', 'Trajectory', 'Impact'].map((flag) => {
                            const isSelected = visibilityFlags.includes(flag);
                            return (
                                <button
                                    key={flag}
                                    onClick={() => toggleFlag(flag)}
                                    disabled={readOnly}
                                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${isSelected
                                        ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                                        : 'bg-background border-border text-foreground-secondary hover:border-foreground-secondary'
                                        }`}
                                >
                                    {flag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Knockdown - Compact */}
                <div className="mb-4 flex items-center justify-between bg-background border border-border rounded-lg p-2">
                    <span className="text-[10px] font-medium text-foreground-secondary">Knockdown?</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setKnockdown(true)}
                            disabled={readOnly}
                            className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${knockdown
                                ? 'bg-red-500 text-white'
                                : 'bg-surface border border-border text-foreground-secondary hover:text-foreground'
                                }`}
                        >
                            YES
                        </button>
                        {knockdown && (
                            <button
                                onClick={() => setKnockdown(false)}
                                disabled={readOnly}
                                className="text-[10px] text-foreground-secondary hover:text-foreground underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                        onClick={handleAction}
                        disabled={readOnly || isTimeInvalid}
                        className={`flex-1 cursor-pointer py-2.5 text-xs font-bold rounded-lg transition-colors shadow-lg shadow-white/5 ${isTimeInvalid || readOnly
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
                        className={`px-3 cursor-pointer py-2.5 bg-red-500/10 border border-red-500/50 text-red-500 text-xs font-medium rounded-lg transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/20 hover:border-red-500'}`}
                    >
                        {isEditing ? 'Cancel' : 'Clear'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidebarControls;
