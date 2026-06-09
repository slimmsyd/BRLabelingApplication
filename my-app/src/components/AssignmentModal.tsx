'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

interface User {
    id: string;
    email: string;
    username: string;
    accountType: string;
}

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoId: string;
    videoTitle: string;
    onAssignmentSuccess: () => void;
    currentAssigneeId?: string;
}

const AssignmentModal = ({ isOpen, onClose, videoId, videoTitle, onAssignmentSuccess, currentAssigneeId }: AssignmentModalProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [labelType, setLabelType] = useState('OFFENSE');
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user: currentUser } = useCurrentUser();

    // Pre-select current assignee when modal opens
    useEffect(() => {
        if (isOpen && currentAssigneeId) {
            setSelectedUserId(currentAssigneeId);
            console.log('[AssignmentModal] Pre-selecting current assignee:', currentAssigneeId);
        } else if (isOpen && !currentAssigneeId) {
            setSelectedUserId('');
        }
    }, [isOpen, currentAssigneeId]);

    // Fetch users when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchUsers = async () => {
                setFetchingUsers(true);
                setError(null);
                try {
                    const response = await fetch('/api/users');
                    if (!response.ok) {
                        throw new Error('Failed to fetch users');
                    }
                    const data = await response.json();
                    setUsers(data.users);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to load users');
                } finally {
                    setFetchingUsers(false);
                }
            };
            fetchUsers();
        }
    }, [isOpen]);

    const handleAssign = async () => {
        if (!selectedUserId || !currentUser) {
            setError('Please select a user');
            return;
        }

        console.log('[AssignmentModal] Starting assignment:', {
            videoId,
            videoTitle,
            targetUserId: selectedUserId,
            labelType,
            currentUserId: currentUser.userId
        });

        setLoading(true);
        setError(null);

        try {
            const payload = {
                userId: currentUser.userId,
                email: currentUser.email,
                targetUserId: selectedUserId,
                labelType,
            };

            console.log('[AssignmentModal] Sending payload:', payload);

            const response = await fetch(`/api/videos/${videoId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('[AssignmentModal] Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[AssignmentModal] Assignment failed:', errorData);
                throw new Error('Failed to assign video');
            }

            const result = await response.json();
            console.log('[AssignmentModal] Assignment successful:', result);

            onAssignmentSuccess();
            onClose();
        } catch (err) {
            console.error('[AssignmentModal] Error:', err);
            setError(err instanceof Error ? err.message : 'Assignment failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                            <UserPlus size={20} className="text-accent-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Assign Video</h2>
                            <p className="text-xs text-foreground-secondary truncate max-w-[250px]">{videoTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
                    >
                        <X size={18} className="text-foreground-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {fetchingUsers ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-accent-primary" />
                        </div>
                    ) : (
                        <>
                            {/* User Selection */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Assign to User
                                </label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all"
                                >
                                    <option value="">Select a user...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.username} ({user.email}) - {user.accountType}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Label Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Label Type
                                </label>
                                <select
                                    value={labelType}
                                    onChange={(e) => setLabelType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all"
                                >
                                    <option value="OFFENSE">Offense</option>
                                    <option value="DEFENSE">Defense</option>
                                    <option value="FOOTWORK">Footwork</option>
                                </select>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-500">{error}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={loading || !selectedUserId || fetchingUsers}
                        className="px-6 py-2 bg-accent-primary hover:bg-accent-primary/90 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Assign Video
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentModal;
