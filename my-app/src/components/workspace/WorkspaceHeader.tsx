import React, { useState } from 'react';
import { ArrowLeft, Save, ShieldCheck, Send, AlertTriangle, X, UserPlus, User, Check, Loader2, Pencil } from 'lucide-react';
import Link from 'next/link';

interface WorkspaceHeaderProps {
    onSave?: () => void;
    onSubmit?: () => void;
    readOnly?: boolean;
    isQCMode?: boolean;
    onToggleQCMode?: () => void;
    showQCToggle?: boolean;
    videoTitle?: string;
    videoMetadata?: string;
    assignment?: any;
    onAssign?: () => void;
    currentUser?: { userId: string; email: string; accountType: string } | null;
    saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
    isSubmitting?: boolean;
    isRecording?: boolean;
    onToggleRecording?: () => void;
    canControlRecording?: boolean;
    videoData?: { boxer1: string; boxer2: string; round: number };
    onUpdateVideo?: (updates: { boxer1: string; boxer2: string; round: number }) => Promise<void>;
}

const WorkspaceHeader = ({ onSave, onSubmit, readOnly = false, isQCMode = false, onToggleQCMode, showQCToggle = false, videoTitle, videoMetadata, assignment, onAssign, currentUser, saveStatus = 'idle', isSubmitting = false, isRecording = false, onToggleRecording, canControlRecording = true, videoData, onUpdateVideo }: WorkspaceHeaderProps) => {
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editBoxer1, setEditBoxer1] = useState('');
    const [editBoxer2, setEditBoxer2] = useState('');
    const [editRound, setEditRound] = useState(1);
    const [isSavingTitle, setIsSavingTitle] = useState(false);

    const canEdit = onUpdateVideo && (currentUser?.accountType === 'ADMIN' || currentUser?.accountType === 'QUALITY_CONTROL');

    const handleStartEdit = () => {
        if (!videoData) return;
        setEditBoxer1(videoData.boxer1);
        setEditBoxer2(videoData.boxer2);
        setEditRound(videoData.round);
        setIsEditingTitle(true);
    };

    const handleSaveEdit = async () => {
        if (!onUpdateVideo) return;
        setIsSavingTitle(true);
        try {
            await onUpdateVideo({ boxer1: editBoxer1, boxer2: editBoxer2, round: editRound });
            setIsEditingTitle(false);
        } catch {
            // error handled by parent
        } finally {
            setIsSavingTitle(false);
        }
    };

    const handleConfirmSubmit = () => {
        if (onSubmit) {
            onSubmit();
        }
        setShowSubmitModal(false);
    };

    const handleConfirmAssign = () => {
        if (onAssign) {
            onAssign();
        }
        setShowAssignModal(false);
    };

    const isAssigned = assignment !== null && assignment !== undefined;
    const assigneeName = assignment?.user?.username || assignment?.user?.email || 'Unknown';
    const isCurrentUserAssigned = assignment?.userId === currentUser?.userId;

    return (
        <>
            <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-foreground-secondary hover:text-foreground transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2">
                                <input
                                    value={editBoxer1}
                                    onChange={(e) => setEditBoxer1(e.target.value)}
                                    className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground w-36 focus:outline-none focus:border-accent-primary"
                                    placeholder="Boxer 1"
                                />
                                <span className="text-foreground-secondary text-sm">v</span>
                                <input
                                    value={editBoxer2}
                                    onChange={(e) => setEditBoxer2(e.target.value)}
                                    className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground w-36 focus:outline-none focus:border-accent-primary"
                                    placeholder="Boxer 2"
                                />
                                <span className="text-foreground-secondary text-sm">R</span>
                                <input
                                    type="number"
                                    value={editRound}
                                    onChange={(e) => setEditRound(Number(e.target.value))}
                                    min={1}
                                    max={12}
                                    className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground w-14 focus:outline-none focus:border-accent-primary"
                                />
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingTitle}
                                    className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                    {isSavingTitle ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    Save
                                </button>
                                <button
                                    onClick={() => setIsEditingTitle(false)}
                                    disabled={isSavingTitle}
                                    className="px-2 py-1 border border-border text-foreground-secondary text-xs rounded hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold text-foreground">
                                    {videoTitle || 'Video Labeling Workspace'}
                                </h1>
                                {canEdit && (
                                    <button
                                        onClick={handleStartEdit}
                                        className="text-foreground-secondary hover:text-foreground transition-colors cursor-pointer p-1 rounded hover:bg-white/5"
                                        title="Edit fight details"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                        {!isEditingTitle && videoMetadata && (
                            <p className="text-xs text-foreground-secondary">{videoMetadata}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                            <span className={`w-2 h-2 rounded-full ${assignment?.status === 'SUBMITTED' ? 'bg-yellow-500' :
                                assignment?.status === 'REVIEWED' ? 'bg-blue-500' :
                                    assignment?.status === 'COMPLETED' ? 'bg-green-500' :
                                        readOnly ? 'bg-red-500' : 'bg-green-500'
                                }`}></span>
                            <span>{
                                assignment?.status === 'SUBMITTED' ? 'Submitted - Awaiting QC' :
                                    assignment?.status === 'REVIEWED' ? 'Reviewed' :
                                        assignment?.status === 'COMPLETED' ? 'Completed' :
                                            readOnly ? 'Read Only' : 'In Progress'
                            }</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Assignment Button/Display */}
                    {!isAssigned ? (
                        <button
                            onClick={() => setShowAssignModal(true)}
                            className="flex cursor-pointer items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-600/50 text-blue-600 text-sm font-medium rounded-lg transition-colors hover:bg-blue-600/20 hover:border-blue-600"
                        >
                            <UserPlus size={16} />
                            Assign to Me
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-foreground-secondary text-sm font-medium rounded-lg">
                            <User size={16} />
                            <span>
                                {isCurrentUserAssigned ? 'You' : assigneeName}
                            </span>
                        </div>
                    )}

                    {showQCToggle && (
                        <button
                            onClick={onToggleQCMode}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${isQCMode ? 'bg-accent-primary text-white' : 'text-foreground-secondary/50 hover:text-foreground-secondary hover:bg-white/5'}`}
                        >
                            <ShieldCheck size={16} />
                            QC Mode: {isQCMode ? 'ON' : 'OFF'}
                        </button>
                    )}
                    {/* Recording Toggle Button */}
                    <button
                        onClick={onToggleRecording}
                        disabled={!canControlRecording}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            isRecording
                                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse-slow'
                                : 'bg-white/10 text-foreground hover:bg-white/20'
                        } ${!canControlRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {/* Pulsing dot when recording */}
                        {isRecording && (
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        )}
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                    <button
                        onClick={onSave}
                        disabled={readOnly || saveStatus === 'saving'}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                            saveStatus === 'saved' 
                                ? 'bg-green-500/20 text-green-500 border border-green-500/50' 
                                : saveStatus === 'error'
                                    ? 'bg-red-500/20 text-red-500 border border-red-500/50'
                                    : saveStatus === 'saving'
                                        ? 'bg-white/10 text-foreground-secondary'
                                        : 'bg-white/10 text-foreground hover:bg-white/20'
                        } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saveStatus === 'saving' ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : saveStatus === 'saved' ? (
                            <Check size={16} />
                        ) : (
                            <Save size={16} />
                        )}
                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save Progress'}
                    </button>
                    <button
                        onClick={() => setShowSubmitModal(true)}
                        disabled={readOnly || isSubmitting}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                            isSubmitting
                                ? 'bg-white/10 text-foreground-secondary cursor-wait'
                                : isQCMode 
                                    ? 'bg-purple-600/10 border border-purple-600/50 text-purple-600 hover:bg-purple-600/20 hover:border-purple-600'
                                    : 'bg-green-600/10 border border-green-600/50 text-green-600 hover:bg-green-600/20 hover:border-green-600'
                        } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : isQCMode ? (
                            <ShieldCheck size={16} />
                        ) : (
                            <Send size={16} />
                        )}
                        {isSubmitting ? 'Submitting...' : isQCMode ? 'Approve QC' : 'Submit'}
                    </button>
                </div>
            </header>

            {/* Confirmation Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-surface border border-border rounded-xl p-6 w-[400px] shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`flex items-center gap-3 ${isQCMode ? 'text-purple-500' : 'text-amber-500'}`}>
                                {isQCMode ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                                <h3 className="text-lg font-semibold text-foreground">
                                    {isQCMode ? 'Confirm QC Approval' : 'Confirm Submission'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                className="text-foreground-secondary hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-foreground-secondary mb-4">
                            {isQCMode 
                                ? 'Are you sure you want to approve this video? This will mark it as QC reviewed.'
                                : 'Are you sure you want to submit? This will finalize your labeling session.'}
                        </p>

                        {/* Status Change Indicator */}
                        <div className={`flex items-center gap-3 p-3 rounded-lg mb-6 ${
                            isQCMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                        }`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isQCMode ? 'bg-purple-500' : 'bg-amber-500'}`}></div>
                                <span className={`text-xs font-medium ${isQCMode ? 'text-purple-500' : 'text-amber-500'}`}>
                                    Status will change to:
                                </span>
                            </div>
                            <span className={`text-xs font-bold ${isQCMode ? 'text-purple-500' : 'text-amber-500'}`}>
                                {isQCMode ? 'REVIEWED ✓' : 'SUBMITTED → Awaiting QC'}
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                disabled={isSubmitting}
                                className={`flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-white/5 transition-colors font-medium cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSubmit}
                                disabled={isSubmitting}
                                className={`flex-1 px-4 py-2 rounded-lg transition-colors font-bold cursor-pointer flex items-center justify-center gap-2 ${
                                    isSubmitting
                                        ? 'bg-white/20 text-foreground-secondary cursor-wait'
                                        : isQCMode 
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'bg-foreground text-black hover:bg-white/90'
                                }`}
                            >
                                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                {isSubmitting ? 'Submitting...' : isQCMode ? 'Yes, Approve' : 'Yes, Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Confirmation Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-surface border border-border rounded-xl p-6 w-[400px] shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 text-blue-500">
                                <UserPlus size={24} />
                                <h3 className="text-lg font-semibold text-foreground">Assign Video</h3>
                            </div>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="text-foreground-secondary hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-foreground-secondary mb-6">
                            Are you sure you want to assign this video to yourself? You will be able to work on it.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-white/5 transition-colors font-medium cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAssign}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold cursor-pointer"
                            >
                                Yes, Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default WorkspaceHeader;
