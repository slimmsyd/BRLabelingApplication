/**
 * Deterministic reproduction of the multi-cam freeze.
 *
 *   npx tsx scripts/repro-camera-switch-freeze.ts
 *
 * WHY THIS EXISTS
 * Reproducing by hand needs a slow network at exactly the right moment, which is
 * not a repeatable signal. The bug is not really about the network though: the
 * network only decides HOW LONG a seek takes. What actually breaks is that a
 * camera switch left in flight is never cancelled when the next switch starts.
 *
 * So this harness renders the REAL VideoPlayer through React's real effect
 * lifecycle and replaces only the media layer, where a fake <video> never
 * completes a seek until this script says so. That turns "sometimes, on bad
 * wifi" into a deterministic, offline, sub-second test.
 *
 * It asserts nothing about my theory up front. It drives the sequence and
 * reports what the component actually did.
 */

import { JSDOM } from 'jsdom';

// ── 1. DOM must exist before React or the component are imported ────────────
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/workspace?videoId=repro&trace=video',
    pretendToBeVisual: true,
});

const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
// Node exposes `navigator` as a getter-only global, so plain assignment throws.
Object.defineProperty(g, 'navigator', {
    value: dom.window.navigator, configurable: true, writable: true,
});
g.HTMLElement = dom.window.HTMLElement;
g.HTMLMediaElement = dom.window.HTMLMediaElement;
g.HTMLVideoElement = dom.window.HTMLVideoElement;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.Node = dom.window.Node;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;

// ── 2. Fake media layer ─────────────────────────────────────────────────────
// jsdom does not implement HTMLMediaElement playback at all, so we own it.
// The important property: setting currentTime starts a seek that stays PENDING
// until completeSeek() is called. That is the whole race, made controllable.

type MediaState = {
    paused: boolean;
    currentTime: number;
    duration: number;
    readyState: number;
    networkState: number;
    seeking: boolean;
    ended: boolean;
    pendingSeekTo: number | null;
    playCalls: number;
    pauseCalls: number;
};

const mediaState = new WeakMap<any, MediaState>();

function stateOf(el: any): MediaState {
    let s = mediaState.get(el);
    if (!s) {
        s = {
            paused: true, currentTime: 0, duration: 300, readyState: 0,
            networkState: 1, seeking: false, ended: false,
            pendingSeekTo: null, playCalls: 0, pauseCalls: 0,
        };
        mediaState.set(el, s);
    }
    return s;
}

const proto = dom.window.HTMLMediaElement.prototype;
function defineAccessor(name: string, get: (s: MediaState, el: any) => unknown, set?: (s: MediaState, v: any, el: any) => void) {
    Object.defineProperty(proto, name, {
        configurable: true,
        get(this: any) { return get(stateOf(this), this); },
        ...(set ? { set(this: any, v: any) { set(stateOf(this), v, this); } } : {}),
    });
}

defineAccessor('paused', (s) => s.paused);
defineAccessor('duration', (s) => s.duration);
defineAccessor('readyState', (s) => s.readyState);
defineAccessor('networkState', (s) => s.networkState);
defineAccessor('seeking', (s) => s.seeking);
defineAccessor('ended', (s) => s.ended);
defineAccessor('error', () => null);
defineAccessor('buffered', () => ({ length: 0 }));
defineAccessor(
    'currentTime',
    (s) => s.currentTime,
    (s, v) => {
        // Matches the HTML spec: assigning currentTime moves the OFFICIAL playback
        // position immediately, then seeks asynchronously and fires 'seeked' when
        // the media data is actually there. So the getter reflects the new value
        // right away even while seeking — do not "hold" the old value here, or the
        // harness invents a rewind bug that real browsers do not have.
        s.currentTime = Number(v);
        s.pendingSeekTo = Number(v);
        s.seeking = true;
    },
);

proto.play = function (this: any) {
    const s = stateOf(this);
    s.playCalls++;
    s.paused = false;
    return Promise.resolve();
};
proto.pause = function (this: any) {
    const s = stateOf(this);
    s.pauseCalls++;
    s.paused = true;
};
proto.load = function () { /* no-op: sources are fake */ };

/** Land a pending seek and fire 'seeked', exactly when we choose. */
function completeSeek(el: any) {
    const s = stateOf(el);
    if (s.pendingSeekTo === null) return false;
    s.currentTime = s.pendingSeekTo;
    s.pendingSeekTo = null;
    s.seeking = false;
    el.dispatchEvent(new dom.window.Event('seeked'));
    return true;
}

/** Make a camera warm (instantly switchable) or cold (must wait for canplay). */
function setReady(el: any, readyState: number) {
    stateOf(el).readyState = readyState;
}

function fireCanPlay(el: any) {
    stateOf(el).readyState = 4;
    el.dispatchEvent(new dom.window.Event('canplay'));
}

// ── 3. Reporting helpers ────────────────────────────────────────────────────
const RESET = '\x1b[0m', RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', BOLD = '\x1b[1m';
let bugsFound = 0;

function head(t: string) { console.log(`\n${BOLD}${t}${RESET}`); }
function step(t: string) { console.log(`  · ${t}`); }
function observe(label: string, value: unknown) { console.log(`      ${label}: ${JSON.stringify(value)}`); }
function bug(t: string, detail?: unknown) {
    bugsFound++;
    console.log(`  ${RED}${BOLD}REPRODUCED${RESET} ${RED}${t}${RESET}`);
    if (detail !== undefined) console.log(`      ${JSON.stringify(detail)}`);
}
function ok(t: string) { console.log(`  ${GREEN}ok${RESET} ${t}`); }

async function main() {
    const React = (await import('react')).default;
    const { act } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const VideoPlayer = (await import('../src/components/workspace/VideoPlayer')).default;

    const videoSources = {
        cam1: 'https://example.test/cam1.mp4',
        cam2: 'https://example.test/cam2.mp4',
        cam3: 'https://example.test/cam3.mp4',
        cam4: 'https://example.test/cam4.mp4',
    };

    // Mirrors src/app/workspace/page.tsx: activeCam lives in the parent.
    const videoRef: { current: HTMLVideoElement | null } = { current: null };
    let setCam: (c: string) => void = () => { };

    function Harness() {
        const [activeCam, setActiveCam] = React.useState('CAM 1');
        setCam = setActiveCam;
        return React.createElement(VideoPlayer, {
            videoRef: videoRef as any,
            activeCam,
            setActiveCam,
            videoSources,
            fps: 30,
        });
    }

    // STRICT=1 wraps in React.StrictMode, which double-invokes effects (mount →
    // cleanup → mount). Worth running because the fix ADDED a cleanup to an effect
    // that never had one, and a cleanup that tears down state the remounted effect
    // then skips re-arming would break switching outright. `next dev` runs StrictMode
    // by default, so this is the shape a labeler on a dev build would hit.
    const strict = process.env.STRICT === '1';
    console.log(strict ? `${BOLD}[StrictMode ON]${RESET}` : `${BOLD}[StrictMode off]${RESET}`);

    const container = dom.window.document.getElementById('root')!;
    const root = createRoot(container);
    await act(async () => {
        const tree = React.createElement(Harness);
        root.render(strict ? React.createElement(React.StrictMode, null, tree) : tree);
    });

    const vids = Array.from(dom.window.document.querySelectorAll('video')) as any[];
    const [cam1, cam2, cam3] = vids;
    const camName = (el: any) => (el === cam1 ? 'CAM 1' : el === cam2 ? 'CAM 2' : el === cam3 ? 'CAM 3' : el === vids[3] ? 'CAM 4' : 'none');
    const visible = (el: any) => el.style.display !== 'none';
    const overlayUp = () => !!Array.from(dom.window.document.querySelectorAll('p'))
        .find((p: any) => p.textContent?.includes('Loading camera'));

    console.log(`\n${BOLD}Rendered real VideoPlayer with ${vids.length} camera elements.${RESET}`);

    // ════════════════════════════════════════════════════════════════════════
    head('SCENARIO A — switch away while a seek is still in flight (all cams warm)');
    // ════════════════════════════════════════════════════════════════════════
    vids.forEach((v) => setReady(v, 4));           // every camera instantly switchable
    stateOf(cam1).paused = false;                   // user is watching CAM 1, playing
    stateOf(cam1).currentTime = 41.5;

    step('CAM 1 playing at 41.5s. User clicks CAM 2.');
    await act(async () => { setCam('CAM 2'); });
    observe('cam2 seek pending to', stateOf(cam2).pendingSeekTo);
    observe('cam2 seeked handler armed', stateOf(cam2).pendingSeekTo !== null);

    step('Before CAM 2 finishes seeking, user clicks CAM 3.');
    await act(async () => { setCam('CAM 3'); });
    observe('on screen now', vids.filter(visible).map(camName));

    step("Now CAM 2's seek finally lands (slow network delivering late).");
    await act(async () => { completeSeek(cam2); });

    // ── What actually happened? ──
    const cam2State = stateOf(cam2);
    observe('activeCam (on screen)', vids.filter(visible).map(camName));
    observe('cam2 paused', cam2State.paused);
    observe('cam2 play() calls', cam2State.playCalls);
    observe('videoRef points at', camName(videoRef.current));

    if (!cam2State.paused && !visible(cam2)) {
        bug('a HIDDEN camera is playing', {
            hiddenCamPlaying: camName(cam2),
            onScreen: vids.filter(visible).map(camName),
            playCalls: cam2State.playCalls,
        });
    } else ok('no hidden camera is playing');

    if (videoRef.current && camName(videoRef.current) !== vids.filter(visible).map(camName)[0]) {
        bug('videoRef points at a camera that is NOT on screen (controls are dead)', {
            videoRefPointsAt: camName(videoRef.current),
            onScreen: vids.filter(visible).map(camName),
        });
    } else ok('videoRef points at the visible camera');

    const cam3State = stateOf(cam3);
    observe('cam3 (visible) paused', cam3State.paused);
    observe('cam3 seek still pending', cam3State.pendingSeekTo);
    if (cam3State.paused && !cam2State.paused) {
        bug('the camera the user is LOOKING AT is frozen while another plays', {
            frozenOnScreen: 'CAM 3', playingHidden: 'CAM 2',
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    head('SCENARIO B — pressing play while videoRef is mis-pointed');
    // ════════════════════════════════════════════════════════════════════════
    const beforeCam2 = { play: stateOf(cam2).playCalls, pause: stateOf(cam2).pauseCalls };
    const beforeCam3 = { play: stateOf(cam3).playCalls, pause: stateOf(cam3).pauseCalls };

    step('User clicks the play/pause button, expecting it to affect the camera on screen.');
    const playBtn = Array.from(dom.window.document.querySelectorAll('button'))
        .find((b: any) => b.querySelector('svg') && b.className.includes('hover:text-accent-primary')) as any;
    if (playBtn) {
        await act(async () => { playBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    } else {
        // Fall back to the video surface click, same togglePlay path.
        await act(async () => {
            (vids.find(visible) as any).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
        });
    }

    const afterCam2 = { play: stateOf(cam2).playCalls, pause: stateOf(cam2).pauseCalls };
    const afterCam3 = { play: stateOf(cam3).playCalls, pause: stateOf(cam3).pauseCalls };
    observe('CAM 2 (hidden) play/pause delta', {
        play: afterCam2.play - beforeCam2.play, pause: afterCam2.pause - beforeCam2.pause,
    });
    observe('CAM 3 (on screen) play/pause delta', {
        play: afterCam3.play - beforeCam3.play, pause: afterCam3.pause - beforeCam3.pause,
    });

    const touchedHidden = (afterCam2.play - beforeCam2.play) + (afterCam2.pause - beforeCam2.pause) > 0;
    const touchedVisible = (afterCam3.play - beforeCam3.play) + (afterCam3.pause - beforeCam3.pause) > 0;
    if (touchedHidden && !touchedVisible) {
        bug('the play button drove the HIDDEN camera; the visible one never moved');
    } else if (touchedVisible) {
        ok('play button drove the visible camera');
    }

    // ════════════════════════════════════════════════════════════════════════
    head('SCENARIO C — cold camera, user changes their mind (sticky loading overlay)');
    // ════════════════════════════════════════════════════════════════════════
    await act(async () => { setCam('CAM 1'); });
    await act(async () => { completeSeek(cam1); });
    observe('overlay visible at start', overlayUp());

    step('CAM 4 is cold (readyState 0) — the slow path. User clicks CAM 4.');
    const cam4 = vids[3];
    setReady(cam4, 0);
    await act(async () => { setCam('CAM 4'); });
    observe('overlay visible after clicking cold CAM 4', overlayUp());

    step('CAM 4 is still buffering. User gives up and clicks back to CAM 1.');
    await act(async () => { setCam('CAM 1'); });
    await act(async () => { completeSeek(cam1); });

    observe('on screen', vids.filter(visible).map(camName));
    observe('overlay STILL visible', overlayUp());
    if (overlayUp()) {
        bug('"Loading camera..." overlay is stuck over a camera that already loaded', {
            note: 'this div is z-50 inset-0, so it swallows every click on the player',
            onScreen: vids.filter(visible).map(camName),
        });
    } else ok('overlay cleared correctly');

    step('CAM 4 finally finishes buffering, long after the user moved on.');
    await act(async () => { fireCanPlay(cam4); });
    await act(async () => { completeSeek(cam4); });
    observe('cam4 paused', stateOf(cam4).paused);
    observe('videoRef points at', camName(videoRef.current));
    observe('on screen', vids.filter(visible).map(camName));
    if (!stateOf(cam4).paused && !visible(cam4)) {
        bug('the abandoned cold camera started playing while hidden', {
            playCalls: stateOf(cam4).playCalls,
        });
    }
    if (videoRef.current && !visible(videoRef.current)) {
        bug('videoRef hijacked by the abandoned camera', { videoRefPointsAt: camName(videoRef.current) });
    }

    // ════════════════════════════════════════════════════════════════════════
    head('TRACE (what the flight recorder captured)');
    // ════════════════════════════════════════════════════════════════════════
    const api = (dom.window as any).__videoTrace;
    if (api) {
        const entries = api.entries();
        const anomalies = api.anomalies();
        console.log(`  recorder captured ${entries.length} events, ${anomalies.length} flagged`);
        for (const a of anomalies) console.log(`    ${YELLOW}!!${RESET} ${a.tag} ${JSON.stringify(a.data ?? {})}`);

        // Superseded switches should now bail out and say so. Seeing these is the
        // positive signal that cancellation ran, as opposed to the sequence simply
        // never racing (which would make this whole harness vacuous).
        const abandoned = entries.filter((e: any) => e.tag === 'switch.abandoned');
        console.log(`  switch.abandoned events: ${abandoned.length}`);
        for (const a of abandoned) console.log(`    ${GREEN}·${RESET} switch #${a.data.id} bailed: ${a.data.reason}`);
        if (abandoned.length === 0 && bugsFound === 0) {
            // Expected. The effect cleanup detaches the listener before the event is
            // dispatched, so the handler never runs and never reaches its isCurrent()
            // guard. Cancellation is doing the work; the guard is defense-in-depth for
            // a handler already executing. Do not read 0 here as "the test did nothing":
            // reverting VideoPlayer.tsx to HEAD makes this same script report 6 defects.
            console.log(`  ${GREEN}0 is expected${RESET}: teardown removes listeners before they fire,`);
            console.log(`  so handlers never reach the isCurrent() guard. Guard is belt-and-braces.`);
        }
    } else {
        console.log(`  ${RED}__videoTrace was never installed — trace did not initialise${RESET}`);
    }

    head('RESULT');
    if (bugsFound > 0) {
        console.log(`  ${RED}${BOLD}${bugsFound} defect(s) reproduced deterministically, with no network involved.${RESET}\n`);
    } else {
        console.log(`  ${GREEN}${BOLD}No defect reproduced by this sequence.${RESET}\n`);
    }
    process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
