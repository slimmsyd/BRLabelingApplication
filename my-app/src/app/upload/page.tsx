'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileVideo, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const UploadPage = () => {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [round, setRound] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type.startsWith('video/')) {
                setFile(droppedFile);
                if (!title) {
                    setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
                }
                setError('');
            } else {
                setError('Please upload a valid video file.');
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }
            setError('');
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a video file.');
            return;
        }

        setUploading(true);
        setError('');

        // TODO: Implement actual upload logic here
        // For now, we'll simulate an upload delay
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('Uploading:', { file, title, description, round });
            router.push('/');
        } catch (err) {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors mb-8">
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </Link>

                <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
                    <h1 className="text-2xl font-semibold mb-2">Upload New Video</h1>
                    <p className="text-foreground-secondary mb-8">Upload a fight video to start labeling events.</p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* File Upload Area */}
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${isDragging
                                ? 'border-accent-primary bg-accent-primary/5'
                                : 'border-border hover:border-foreground-secondary hover:bg-surface-hover'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="video/*"
                                onChange={handleFileSelect}
                            />

                            {file ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                                        <FileVideo size={32} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{file.name}</p>
                                        <p className="text-sm text-foreground-secondary">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile();
                                        }}
                                        className="absolute top-4 right-4 p-2 text-foreground-secondary hover:text-red-500 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center text-foreground-secondary">
                                        <Upload size={32} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground mb-1">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-sm text-foreground-secondary">
                                            MP4, MOV, or WebM (max. 2GB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Metadata Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg py-2.5 px-4 text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                    placeholder="e.g. Crawford vs. Spence"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full bg-background border border-border rounded-lg py-2.5 px-4 text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all resize-none"
                                    placeholder="Add notes about this fight..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground-secondary mb-3">
                                    Round
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRound(r)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${round === r
                                                ? 'bg-accent-primary text-white border-accent-primary'
                                                : 'bg-background text-foreground-secondary border-border hover:border-foreground-secondary hover:text-foreground'
                                                }`}
                                        >
                                            Round {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-500">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={uploading || !file}
                                className="px-6 py-2.5 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors shadow-lg shadow-accent-primary/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    'Upload Video'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
