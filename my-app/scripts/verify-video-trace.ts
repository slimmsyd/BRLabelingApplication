/**
 * Verifies the camera-switch flight recorder (src/lib/video-trace.ts).
 *
 * The recorder is the only thing standing between us and another round of
 * "it froze again, I don't know what I clicked", so it needs to be known-good
 * before a labeler relies on it. Checks the gating, the ring buffer, anomaly
 * marking, and the dump format.
 *
 *   npx tsx scripts/verify-video-trace.ts
 */

export { }; // keep this file a module — otherwise `main` lands in the global scope
// and collides with the other scripts/ entrypoints under tsc.

// ── Stub the browser globals video-trace.ts touches ────────────────────────
const store = new Map<string, string>();

function installWindow(search: string) {
    (globalThis as any).window = {
        location: { search },
        localStorage: {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
            removeItem: (k: string) => void store.delete(k),
        },
    };
    // Node exposes `navigator` as a getter-only global, so assignment throws.
    Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: { writeText: async () => { } } },
        configurable: true,
        writable: true,
    });
}

/**
 * video-trace.ts guards init with a module-level `initialized` flag, so a plain
 * re-import returns the already-decided state. Evict it from the require cache
 * to get a genuinely fresh module per scenario. (A `?query=` cache-buster does
 * not work here — tsx runs CJS, which resolves by path and ignores the query.)
 */
const TRACE_PATH = require.resolve('../src/lib/video-trace.ts');
function loadFreshTrace() {
    delete require.cache[TRACE_PATH];
    return require(TRACE_PATH);
}

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
    if (cond) {
        console.log(`  PASS  ${label}`);
    } else {
        failures++;
        console.error(`  FAIL  ${label}`, detail !== undefined ? detail : '');
    }
}

async function main() {
    console.log('\nverify-video-trace\n');

    // ── 1. OFF by default ──────────────────────────────────────────────────
    console.log('1. disabled unless explicitly turned on');
    installWindow('');
    let mod = loadFreshTrace();
    check('initVideoTrace() returns false with no flag', mod.initVideoTrace() === false);
    check('isVideoTraceEnabled() is false', mod.isVideoTraceEnabled() === false);
    mod.vtrace('should.not.record');
    mod.vtraceAnomaly('should.not.record.either');
    check('no window.__videoTrace installed', (globalThis as any).window.__videoTrace === undefined);
    check('snapVideo still works while disabled', mod.snapVideo(null) === null);

    // ── 2. ?trace=video enables and persists ───────────────────────────────
    console.log('\n2. ?trace=video enables it and persists to localStorage');
    store.clear();
    installWindow('?videoId=abc&trace=video');
    mod = loadFreshTrace();
    check('initVideoTrace() returns true', mod.initVideoTrace() === true);
    check('isVideoTraceEnabled() is true', mod.isVideoTraceEnabled() === true);
    check('persisted br_video_trace=1 for later navigations', store.get('br_video_trace') === '1');
    check('window.__videoTrace installed', typeof (globalThis as any).window.__videoTrace === 'object');

    // ── 3. Records in order, marks anomalies ───────────────────────────────
    console.log('\n3. records entries in order and marks anomalies');
    const api = (globalThis as any).window.__videoTrace;
    api.clear();
    mod.vtrace('tab.click', { clicked: 'CAM 2' });
    mod.vtrace('switch.start', { id: 1 });
    mod.vtraceAnomaly('switch.STALE_HANDLER_seeked', { id: 1, currentSwitchId: 2 });
    mod.vtrace('switch.done', { id: 2 });

    const entries = api.entries();
    check('recorded 4 entries', entries.length === 4, entries.length);
    check('order preserved', entries.map((e: any) => e.tag).join(',')
        === 'tab.click,switch.start,switch.STALE_HANDLER_seeked,switch.done');
    check('exactly 1 anomaly flagged', api.anomalies().length === 1);
    check('anomaly is the stale handler', api.anomalies()[0].tag === 'switch.STALE_HANDLER_seeked');
    check('timestamps are monotonic',
        entries.every((e: any, i: number) => i === 0 || e.t >= entries[i - 1].t));

    // ── 4. Dump is readable and greppable ──────────────────────────────────
    console.log('\n4. dump output is readable and greppable');
    const text: string = api.dump();
    check('header reports the anomaly count', text.includes('4 entries, 1 anomalies'), text.split('\n')[0]);
    check('anomaly lines are prefixed with !!', text.includes('!! switch.STALE_HANDLER_seeked'));
    check('normal lines are not prefixed with !!', !text.includes('!! tab.click'));
    check('payload JSON is included', text.includes('"currentSwitchId":2'));

    // ── 5. Ring buffer caps memory during a long labeling session ──────────
    console.log('\n5. ring buffer caps at 600 entries (long sessions cannot OOM)');
    api.clear();
    for (let i = 0; i < 1000; i++) mod.vtrace('media.progress', { n: i });
    const capped = api.entries();
    check('capped at 600', capped.length === 600, capped.length);
    check('keeps the NEWEST entries (freeze is at the end)',
        capped[capped.length - 1].data.n === 999, capped[capped.length - 1].data.n);
    check('dropped the oldest', capped[0].data.n === 400, capped[0].data.n);

    // ── 6. snapVideo surfaces the hidden-but-playing state ─────────────────
    console.log('\n6. snapVideo captures the states that identify the bug');
    const fakeHiddenPlaying = {
        paused: false, currentTime: 41.2337, readyState: 4, networkState: 2,
        seeking: false, style: { display: 'none' }, ended: false, error: null,
    };
    const snap = mod.snapVideo(fakeHiddenPlaying as any);
    check('hidden === true for display:none', snap.hidden === true);
    check('paused === false is preserved', snap.paused === false);
    check('time rounded to ms', snap.time === 41.234, snap.time);
    check('null element returns null', mod.snapVideo(null) === null);

    console.log(
        failures === 0
            ? '\nALL CHECKS PASSED — recorder is safe to hand to a labeler\n'
            : `\n${failures} CHECK(S) FAILED\n`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
