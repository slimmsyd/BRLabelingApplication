'use client';



import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileVideo, Loader2, ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';



const UploadPage = () => {
    const router = useRouter();
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        cam1: null,
        cam2: null,
        cam3: null
    });
    const [boxer1, setBoxer1] = useState('');
    const [boxer2, setBoxer2] = useState('');
    const [weightClass, setWeightClass] = useState('');
    const [round, setRound] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const fileInputRefs = {
        cam1: useRef<HTMLInputElement>(null),
        cam2: useRef<HTMLInputElement>(null),
        cam3: useRef<HTMLInputElement>(null)
    };

    const handleFileSelect = (cam: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFiles(prev => ({ ...prev, [cam]: selectedFile }));
            setError('');
        }
    };

    const removeFile = (cam: string) => {
        setFiles(prev => ({ ...prev, [cam]: null }));
        if (fileInputRefs[cam as keyof typeof fileInputRefs].current) {
            fileInputRefs[cam as keyof typeof fileInputRefs].current!.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Require at least Cam 1
        if (!files.cam1) {
            setError('Please upload at least Camera 1 video.');
            return;
        }

        setUploading(true);
        setError('');

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('Uploading:', {
                files,
                boxer1,
                boxer2,
                weightClass,
                round
            });
            router.push('/');
        } catch (err) {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-5xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors mb-8">
                    <ArrowLeft size={20} />
                    <span>Back to Dashboard</span>
                </Link>

                <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-semibold">Upload Fight Footage</h1>
                        <div className="px-3 py-1 bg-accent-primary/10 text-accent-primary text-xs font-medium rounded-full border border-accent-primary/20">
                            Multi-Angle Support
                        </div>
                    </div>
                    <p className="text-foreground-secondary mb-8">Upload up to 3 camera angles for this fight.</p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Camera Upload Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {['cam1', 'cam2', 'cam3'].map((cam, index) => (
                                <div key={cam} className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-foreground-secondary uppercase tracking-wider">
                                        <Camera size={14} />
                                        Camera {index + 1} {index === 0 && <span className="text-accent-primary">*</span>}
                                    </label>

                                    <div
                                        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer min-h-[200px] flex flex-col items-center justify-center ${files[cam]
                                            ? 'border-accent-primary bg-accent-primary/5'
                                            : 'border-border hover:border-foreground-secondary hover:bg-surface-hover'
                                            }`}
                                        onClick={() => fileInputRefs[cam as keyof typeof fileInputRefs].current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRefs[cam as keyof typeof fileInputRefs]}
                                            className="hidden"
                                            accept="video/*"
                                            onChange={(e) => handleFileSelect(cam, e)}
                                        />

                                        {files[cam] ? (
                                            <div className="flex flex-col items-center gap-3 w-full">
                                                <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                                                    <FileVideo size={24} />
                                                </div>
                                                <div className="w-full overflow-hidden">
                                                    <p className="font-medium text-foreground text-sm truncate px-2" title={files[cam]!.name}>
                                                        {files[cam]!.name}
                                                    </p>
                                                    <p className="text-xs text-foreground-secondary">
                                                        {(files[cam]!.size / (1024 * 1024)).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(cam);
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 text-foreground-secondary hover:text-red-500 transition-colors bg-surface rounded-full border border-border shadow-sm"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-foreground-secondary">
                                                    <Upload size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground text-sm mb-0.5">
                                                        Upload Video
                                                    </p>
                                                    <p className="text-[10px] text-foreground-secondary">
                                                        MP4, MOV, WebM
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-border/50 my-8" />

                        {/* Metadata Fields */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                        Boxer 1 Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={boxer1}
                                        onChange={(e) => setBoxer1(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg py-2.5 px-4 text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                        placeholder="e.g. Terence Crawford"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                        Boxer 2 Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={boxer2}
                                        onChange={(e) => setBoxer2(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg py-2.5 px-4 text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                        placeholder="e.g. Errol Spence Jr."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                        Weightclass
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={weightClass}
                                        onChange={(e) => setWeightClass(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg py-2.5 px-4 text-foreground placeholder:text-foreground-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                                        placeholder="e.g. Welterweight"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground-secondary mb-3">
                                        Round
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRound(r)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${round === r
                                                    ? 'bg-accent-primary text-white border-accent-primary'
                                                    : 'bg-background text-foreground-secondary border-border hover:border-foreground-secondary hover:text-foreground'
                                                    }`}
                                            >
                                                R{r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-500">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={uploading || !files.cam1}
                                className="px-6 py-2.5 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors shadow-lg shadow-accent-primary/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    'Upload Footage'
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
