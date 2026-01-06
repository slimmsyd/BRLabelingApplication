import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
}

const SuccessModal = ({ isOpen, onClose, userName }: SuccessModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-surface border border-border rounded-xl p-8 w-[400px] shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-foreground-secondary hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500">
                    <CheckCircle size={32} strokeWidth={3} />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">Submission Successful!</h3>
                <p className="text-foreground-secondary mb-8">
                    {userName ? (
                        <>
                            <span className="font-semibold text-foreground">{userName}</span> has successfully submitted the labeling data to the server.
                        </>
                    ) : (
                        'Your labeling data has been successfully submitted to the server.'
                    )}
                </p>

                <button
                    onClick={onClose}
                    className="w-full py-3 bg-foreground text-black rounded-lg hover:bg-white/90 transition-colors font-bold"
                >
                    Return to Workspace
                </button>
            </div>
        </div>
    );
};

export default SuccessModal;
