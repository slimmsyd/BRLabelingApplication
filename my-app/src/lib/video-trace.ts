/**
 * Camera-switch flight recorder.
 *
 * The multi-cam freeze is intermittent and only shows up under real labeler
 * behaviour (fast tab-mashing on a cold cache), so we cannot catch it by
 * staring at a repro. This records a ring buffer of what actually happened and
 * auto-flags the four states that should be impossible:
 *
 *   1. A stale switch handler fires  (switch N-1 resolves after switch N started)
 *   2. A hidden <video> is playing   (you hear/advance a camera you can't see)
 *   3. The visible <video> is paused while the UI thinks it is playing
 *   4. videoRef points at a different element than the one on screen
 *      (controls act on the wrong camera → buttons look dead)
 *
 * OFF by default. Turn it on for a session with `?trace=video` on the workspace
 * URL, or `localStorage.setItem('br_video_trace','1')`. Then, right after the
 * freeze happens, have the labeler run in the console:
 *
 *     __videoTrace.copy()      // copies the timeline to clipboard
 *     __videoTrace.dump()      // or just print it
 *
 * Anomalies are prefixed with `!! ` so they can be found with a search.
 */

export type TraceEntry = {
    /** ms since the recorder started */
    t: number;
    tag: string;
    anomaly: boolean;
    data?: Record<string, unknown>;
};

const RING_SIZE = 600;

let enabled = false;
let initialized = false;
let startedAt = 0;
let ring: TraceEntry[] = [];

/** Read the enable flag once per page load. URL param sticks for the session. */
function resolveEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const param = new URLSearchParams(window.location.search).get('trace');
        if (param === 'video') {
            window.localStorage.setItem('br_video_trace', '1');
            return true;
        }
        if (param === 'off') {
            window.localStorage.removeItem('br_video_trace');
            return false;
        }
        return window.localStorage.getItem('br_video_trace') === '1';
    } catch {
        // Private mode / blocked storage — fall back to the URL only.
        return typeof window !== 'undefined'
            && new URLSearchParams(window.location.search).get('trace') === 'video';
    }
}

function fmt(entry: TraceEntry): string {
    const stamp = (entry.t / 1000).toFixed(3).padStart(8, ' ');
    const mark = entry.anomaly ? '!! ' : '   ';
    const body = entry.data ? ' ' + JSON.stringify(entry.data) : '';
    return `${stamp}s ${mark}${entry.tag}${body}`;
}

function dump(): string {
    if (!enabled) return 'video trace is OFF — reload with ?trace=video';
    const lines = ring.map(fmt);
    const anomalies = ring.filter((e) => e.anomaly).length;
    return [
        `=== VIDEO TRACE (${ring.length} entries, ${anomalies} anomalies) ===`,
        ...lines,
        `=== END VIDEO TRACE ===`,
    ].join('\n');
}

export function initVideoTrace(): boolean {
    if (initialized) return enabled;
    initialized = true;
    enabled = resolveEnabled();
    if (!enabled) return false;

    startedAt = performance.now();
    ring = [];

    const api = {
        dump: () => {
            const text = dump();
            console.log(text);
            return text;
        },
        copy: async () => {
            const text = dump();
            try {
                await navigator.clipboard.writeText(text);
                console.log('video trace copied to clipboard');
            } catch {
                console.log(text);
                console.log('clipboard blocked — copy the text above manually');
            }
            return text;
        },
        entries: () => ring.slice(),
        anomalies: () => ring.filter((e) => e.anomaly),
        clear: () => {
            ring = [];
            startedAt = performance.now();
        },
        off: () => {
            try { window.localStorage.removeItem('br_video_trace'); } catch { }
            console.log('video trace disabled — reload to take effect');
        },
    };

    (window as unknown as Record<string, unknown>).__videoTrace = api;
    console.log(
        '%c[video-trace] recording. After the freeze, run: __videoTrace.copy()',
        'color:#0af;font-weight:bold',
    );
    return true;
}

export function isVideoTraceEnabled(): boolean {
    return enabled;
}

/** Record a normal step. */
export function vtrace(tag: string, data?: Record<string, unknown>): void {
    if (!enabled) return;
    ring.push({ t: performance.now() - startedAt, tag, anomaly: false, data });
    if (ring.length > RING_SIZE) ring.shift();
}

/** Record a should-be-impossible state. Also prints immediately, since these are rare. */
export function vtraceAnomaly(tag: string, data?: Record<string, unknown>): void {
    if (!enabled) return;
    const entry: TraceEntry = { t: performance.now() - startedAt, tag, anomaly: true, data };
    ring.push(entry);
    if (ring.length > RING_SIZE) ring.shift();
    console.warn('[video-trace] ' + fmt(entry));
}

/**
 * Snapshot of a <video> element. `hidden` is the thing that matters most:
 * a hidden element with paused=false is the bug.
 */
export function snapVideo(el: HTMLVideoElement | null): Record<string, unknown> | null {
    if (!el) return null;
    return {
        paused: el.paused,
        time: Number(el.currentTime.toFixed(3)),
        readyState: el.readyState,
        networkState: el.networkState,
        seeking: el.seeking,
        hidden: el.style.display === 'none',
        ended: el.ended,
        err: el.error?.code ?? null,
    };
}
