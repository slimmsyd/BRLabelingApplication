'use client';

/**
 * ClipExportPanel
 *
 * Admin-only UI that lets administrators filter labeled punch events by metadata
 * and export trimmed video clips as a downloadable ZIP file.
 *
 * Architecture:
 *  1. Admin sets filters (punch type, hand, target, etc.) and clicks "Generate Clips"
 *  2. Fetches matching event data (timestamps + source video URLs) from /api/export/events
 *  3. Uses @ffmpeg/ffmpeg (WebAssembly) in the browser to trim each clip
 *  4. Zips all clips using JSZip and triggers a browser download
 *
 * This runs entirely in the browser to avoid Vercel serverless timeout limits.
 */

import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import JSZip from 'jszip';
import { Scissors, Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

/** Fetches a URL and returns a Uint8Array — used to load files into FFmpeg's virtual FS. */
async function urlToUint8Array(url: string): Promise<Uint8Array<ArrayBuffer>> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
}

/** Creates a Blob URL from a remote JS/WASM URL — used to cross-origin-safely load FFmpeg core. */
async function toBlobURL(url: string, mimeType: string): Promise<string> {
    const data = await urlToUint8Array(url);
    // Uint8Array is directly a valid BlobPart — avoids ArrayBufferLike/SharedArrayBuffer issues
    const blob = new Blob([data], { type: mimeType });
    return URL.createObjectURL(blob);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExportEvent {
    eventId: string;
    startTime: string;  // e.g. "00:02.11"
    endTime: string;    // e.g. "00:02.49"
    boxer: string;
    punchType: string;
    hand: string;
    target: string;
    stance: string | null;
    landed: boolean | null;
    punchResult: string | null;
    cam: string | null;
    fightTitle: string | null;
    videoId: string;
    videoTitle: string;
    sourceUrls: string[];
    fps: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts "MM:SS.ms" → decimal seconds for ffmpeg -ss and -to flags.
 * Handles both "1:23.45" and "00:02.11" formats.
 */
function timestampToSeconds(ts: string): number {
    const parts = ts.split(':');
    if (parts.length === 2) {
        const [min, sec] = parts;
        return parseFloat(min) * 60 + parseFloat(sec);
    }
    return parseFloat(ts);
}

/**
 * Sanitizes a string for use as a filename.
 */
function toSafeFilename(str: string): string {
    return str.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PUNCH_TYPES = ['Any', 'Jab', 'Cross', 'Hook', 'Uppercut', 'Overhand', 'Body Shot'];
const HANDS = ['Any', 'Left', 'Right'];
const TARGETS = ['Any', 'Head', 'Body'];
const STANCES = ['Any', 'Orthodox', 'Southpaw'];
const LANDED_OPTIONS = [
    { label: 'Any', value: 'any' },
    { label: 'Landed', value: 'true' },
    { label: 'Missed / Defended', value: 'false' },
];
const MAX_CLIPS = 300;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClipExportPanel() {
    // Filter state
    const [punchType, setPunchType] = useState('Any');
    const [hand, setHand] = useState('Any');
    const [target, setTarget] = useState('Any');
    const [stance, setStance] = useState('Any');
    const [landed, setLanded] = useState('any');
    const [boxerFilter, setBoxerFilter] = useState('');
    const [fightTitle, setFightTitle] = useState('');
    const [availableTitles, setAvailableTitles] = useState<string[]>([]);
    const [limit, setLimit] = useState(50);

    // Process state
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [progress, setProgress] = useState(0);          // 0–100
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [eventCount, setEventCount] = useState<number | null>(null);

    // FFmpeg ref (persists across renders)
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const [ffmpegReady, setFfmpegReady] = useState(false);

    // Load FFmpeg WASM once on mount
    useEffect(() => {
        const loadFFmpeg = async () => {
            try {
                const ffmpeg = new FFmpeg();
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
                ffmpegRef.current = ffmpeg;
                setFfmpegReady(true);
            } catch (e) {
                console.error('Failed to load FFmpeg WASM:', e);
                setError('Failed to initialize video processor. Please refresh and try again.');
            }
        };
        loadFFmpeg();
    }, []);

    // Load available fight titles
    useEffect(() => {
        const fetchTitles = async () => {
            try {
                const res = await fetch('/api/export/titles');
                if (res.ok) {
                    const data = await res.json();
                    setAvailableTitles(data.titles || []);
                }
            } catch (e) {
                console.error('Failed to fetch fight titles:', e);
            }
        };
        fetchTitles();
    }, []);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setDone(false);
        setProgress(0);
        setEventCount(null);

        try {
            // Step 1: Fetch matching events from API
            setStatusMessage('Fetching matching events from database...');
            const params = new URLSearchParams({ limit: String(Math.min(limit, MAX_CLIPS)) });
            if (punchType !== 'Any') params.set('punchType', punchType);
            if (hand !== 'Any') params.set('hand', hand);
            if (target !== 'Any') params.set('target', target);
            if (stance !== 'Any') params.set('stance', stance);
            if (landed !== 'any') params.set('landed', landed);
            if (fightTitle.trim()) params.set('fightTitle', fightTitle.trim());
            if (boxerFilter.trim()) params.set('boxer', boxerFilter.trim());

            const res = await fetch(`/api/export/events?${params}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to fetch events');
            }
            const { events }: { events: ExportEvent[] } = await res.json();
            setEventCount(events.length);

            if (events.length === 0) {
                setStatusMessage('No events found matching your filters.');
                setIsLoading(false);
                return;
            }

            // Step 2: Process clips via FFmpeg WASM
            if (!ffmpegRef.current || !ffmpegReady) {
                throw new Error('Video processor is not ready. Please wait and try again.');
            }
            const ffmpeg = ffmpegRef.current;
            const zip = new JSZip();
            const clipsFolder = zip.folder('clips')!;

            setStatusMessage(`Processing ${events.length} clips...`);

            let completed = 0;
            let skipped = 0;

            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const clipLabel = `${event.punchType} (${event.hand})`;
                const fightLabel = event.fightTitle ?? event.videoTitle;

                // Sub-step 1: Downloading
                setStatusMessage(`Clip ${i + 1}/${events.length} — Downloading: ${clipLabel} — ${fightLabel}`);
                setProgress(Math.round(((i) / events.length) * 90));

                // Use first source URL (cam1 by default unless cam is specified)
                const camIndex = event.cam === 'CAM 2' ? 1 : event.cam === 'CAM 3' ? 2 : 0;
                const sourceUrl = event.sourceUrls[camIndex] ?? event.sourceUrls[0];
                if (!sourceUrl) { skipped++; continue; }

                try {
                    const startSec = timestampToSeconds(event.startTime);
                    const endSec = timestampToSeconds(event.endTime);
                    const duration = Math.max(endSec - startSec, 0.1);

                    const inputFilename = `input_${i}.mp4`;
                    const outputFilename = `clip_${i}.mp4`;

                    // Load video chunk into FFmpeg virtual filesystem via native fetch
                    const inputData = await urlToUint8Array(sourceUrl);
                    await ffmpeg.writeFile(inputFilename, inputData);

                    // Sub-step 2: Encoding
                    setStatusMessage(`Clip ${i + 1}/${events.length} — Encoding: ${clipLabel} (${duration.toFixed(2)}s)`);
                    setProgress(Math.round(((i + 0.5) / events.length) * 90));

                    // Trim the clip
                    await ffmpeg.exec([
                        '-ss', String(startSec),
                        '-i', inputFilename,
                        '-t', String(duration),
                        '-c:v', 'libx264',
                        '-c:a', 'aac',
                        '-avoid_negative_ts', 'make_zero',
                        outputFilename,
                    ]);

                    // Read the output — cast to Uint8Array, then slice buffer for strict ArrayBuffer
                    const data = (await ffmpeg.readFile(outputFilename)) as Uint8Array<ArrayBuffer>;
                    // Pass Uint8Array directly — it is a valid BlobPart, avoids SharedArrayBuffer issues
                    const blob = new Blob([data], { type: 'video/mp4' });

                    // Build a descriptive filename
                    const resultStr = (event.punchResult || (event.landed === true ? 'landed' : 'missed')).toLowerCase();
                    const boxerStr = event.boxer || 'unknown';
                    const name = toSafeFilename(
                        `${boxerStr}_${event.punchType}_${event.hand}_${event.target}_${resultStr}_${event.eventId.slice(-6)}`
                    );
                    clipsFolder.file(`${name}.mp4`, blob);

                    // Clean up FFmpeg virtual FS
                    await ffmpeg.deleteFile(inputFilename);
                    await ffmpeg.deleteFile(outputFilename);
                    completed++;
                } catch (clipErr) {
                    console.warn(`Skipped clip ${i + 1} (${event.eventId}):`, clipErr);
                    skipped++;
                    // Skip and continue — don't fail whole export for one bad clip
                }
            }

            setStatusMessage(`Zipping ${completed} clips${skipped > 0 ? ` (${skipped} skipped)` : ''}...`);

            // Step 3: Zip and download
            setStatusMessage('Zipping clips...');
            setProgress(95);
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `training_clips_${dateStr}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProgress(100);
            setStatusMessage(`Done! Downloaded ${events.length} clips.`);
            setDone(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    const dropdownClass =
        'w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-foreground focus:outline-none focus:border-accent-primary/50 appearance-none cursor-pointer text-sm';

    return (
        <div className="space-y-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-foreground">Training Clip Export</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wide">
                    Admin
                </span>
            </div>

            <div className="bg-surface/30 border border-border/50 rounded-xl p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg mt-1">
                        <Scissors size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <h4 className="font-medium text-foreground">Export Labeled Clips</h4>
                        <p className="text-sm text-foreground-tertiary mt-0.5">
                            Filter events by metadata and download trimmed video clips as a ZIP for AI training.
                            Processing runs in your browser — no server timeouts.
                        </p>
                    </div>
                </div>

                {/* FFmpeg loading indicator */}
                {!ffmpegReady && !error && (
                    <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                        <Loader2 size={14} className="animate-spin" />
                        Loading video processor (WebAssembly)...
                    </div>
                )}

                {/* Filters */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Punch Type */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                            Punch Type
                        </label>
                        <select value={punchType} onChange={(e) => setPunchType(e.target.value)} className={dropdownClass}>
                            {PUNCH_TYPES.map((v) => <option key={v}>{v}</option>)}
                        </select>
                    </div>

                    {/* Hand */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                            Hand
                        </label>
                        <select value={hand} onChange={(e) => setHand(e.target.value)} className={dropdownClass}>
                            {HANDS.map((v) => <option key={v}>{v}</option>)}
                        </select>
                    </div>

                    {/* Target */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                            Target
                        </label>
                        <select value={target} onChange={(e) => setTarget(e.target.value)} className={dropdownClass}>
                            {TARGETS.map((v) => <option key={v}>{v}</option>)}
                        </select>
                    </div>

                    {/* Stance */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                            Stance
                        </label>
                        <select value={stance} onChange={(e) => setStance(e.target.value)} className={dropdownClass}>
                            {STANCES.map((v) => <option key={v}>{v}</option>)}
                        </select>
                    </div>

                    {/* Landed */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                            Result
                        </label>
                        <select value={landed} onChange={(e) => setLanded(e.target.value)} className={dropdownClass}>
                            {LANDED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Max Clips */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                            Max Clips (1–{MAX_CLIPS})
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={MAX_CLIPS}
                            value={limit}
                            onChange={(e) => setLimit(Math.min(MAX_CLIPS, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-foreground focus:outline-none focus:border-accent-primary/50 text-sm"
                        />
                    </div>
                </div>

                {/* Boxer Filter */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                        Fighter Name (optional search)
                    </label>
                    <input
                        type="text"
                        value={boxerFilter}
                        onChange={(e) => setBoxerFilter(e.target.value)}
                        placeholder='e.g. "Mason" or "Noakes"'
                        className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-primary/50 text-sm"
                    />
                </div>

                {/* Fight Title Filter */}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
                        Fight Title (optional search)
                    </label>
                    <input
                        type="text"
                        list="fight-titles"
                        value={fightTitle}
                        onChange={(e) => setFightTitle(e.target.value)}
                        placeholder='e.g. "Nakatani" or "Benavidez"'
                        className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-primary/50 text-sm"
                    />
                    <datalist id="fight-titles">
                        {availableTitles.map((title) => (
                            <option key={title} value={title} />
                        ))}
                    </datalist>
                </div>

                {/* Progress Bar */}
                {isLoading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-foreground-secondary">
                            <span>{statusMessage}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Status messages */}
                {error && (
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}

                {done && !isLoading && (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                        <CheckCircle2 size={16} />
                        Export complete! {eventCount} clips downloaded to your device.
                    </div>
                )}

                {!isLoading && eventCount === 0 && (
                    <div className="text-sm text-foreground-secondary text-center py-2">
                        No events matched your filters. Try broadening the criteria.
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !ffmpegReady}
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/30 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {statusMessage || 'Processing...'}
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Generate &amp; Download Clips
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
