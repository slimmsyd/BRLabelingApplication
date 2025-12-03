import React from 'react';
import { ArrowLeft, Save, ShieldCheck, Send, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface WorkspaceHeaderProps {
    onSave?: () => void;
    onSubmit?: () => void;
}

const WorkspaceHeader = ({ onSave, onSubmit }: WorkspaceHeaderProps) => {
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const handleConfirmSubmit = () => {
        if (onSubmit) {
            onSubmit();
        }
        setShowSubmitModal(false);
    };

    return (
        <>
            <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/5 rounded-lg text-foreground-secondary hover:text-foreground transition-colors">
                        <ArrowLeft size={20} />
                    </Link>

                    <div>
                        <h1 className="text-lg font-semibold text-foreground">Fury vs. Usyk - Round 7</h1>
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span>In Progress</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground-secondary/50 hover:text-foreground-secondary hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                        <ShieldCheck size={16} />
                        QC Mode: OFF
                    </button>
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 text-foreground text-sm font-medium rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                    >
                        <Save size={16} />
                        Save Progress
                    </button>
                    <button
                        onClick={() => setShowSubmitModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600/10 border border-green-600/50 text-green-600 text-sm font-medium rounded-lg hover:bg-green-600/20 hover:border-green-600 transition-colors cursor-pointer"
                    >
                        <Send size={16} />
                        Submit
                    </button>
                </div>
            </header>

            {/* Confirmation Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-surface border border-border rounded-xl p-6 w-[400px] shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 text-amber-500">
                                <AlertTriangle size={24} />
                                <h3 className="text-lg font-semibold text-foreground">Confirm Submission</h3>
                            </div>
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                className="text-foreground-secondary hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-foreground-secondary mb-6">
                            Are you sure you want to submit? This will finalize your labeling session.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-white/5 transition-colors font-medium cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSubmit}
                                className="flex-1 px-4 py-2 bg-foreground text-black rounded-lg hover:bg-white/90 transition-colors font-bold cursor-pointer"
                            >
                                Yes, Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default WorkspaceHeader;
