'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DatePicker from 'react-datepicker';
import {
  FileDown,
  Loader2,
  Calendar,
  ShieldCheck,
  ListOrdered,
  ChevronDown,
  Search,
  AlertTriangle,
} from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern (EST/EDT)', value: 'America/New_York' },
  { label: 'Central (CST/CDT)', value: 'America/Chicago' },
  { label: 'Mountain (MST/MDT)', value: 'America/Denver' },
  { label: 'Pacific (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
];

interface QCUser {
  id: string;
  email: string;
  username: string;
  accountType: string;
}

interface VideoAssignmentLite {
  id: string;
  status: string;
}

interface VideoOption {
  id: string;
  title: string;
  round: number;
  boxer1: string;
  boxer2: string;
  fightDate?: string;
  assignments?: VideoAssignmentLite[];
}

type StatusKey =
  | 'REVIEWED'
  | 'COMPLETED'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'ASSIGNED'
  | 'NONE';

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; dotClass: string; chipClass: string }
> = {
  REVIEWED: {
    label: 'Reviewed',
    dotClass: 'bg-emerald-500',
    chipClass: 'text-emerald-400 bg-emerald-500/15',
  },
  COMPLETED: {
    label: 'Completed',
    dotClass: 'bg-emerald-400',
    chipClass: 'text-emerald-300 bg-emerald-400/15',
  },
  SUBMITTED: {
    label: 'Submitted',
    dotClass: 'bg-blue-500',
    chipClass: 'text-blue-400 bg-blue-500/15',
  },
  IN_PROGRESS: {
    label: 'In progress',
    dotClass: 'bg-amber-500',
    chipClass: 'text-amber-400 bg-amber-500/15',
  },
  ASSIGNED: {
    label: 'Assigned',
    dotClass: 'bg-amber-500/60 ring-1 ring-amber-500',
    chipClass: 'text-amber-400 bg-amber-500/10',
  },
  NONE: {
    label: 'No assignment',
    dotClass: 'bg-zinc-500/40 ring-1 ring-zinc-500/60',
    chipClass: 'text-zinc-400 bg-zinc-500/10',
  },
};

function getStatusKey(video: VideoOption): StatusKey {
  const s = video.assignments?.[0]?.status;
  if (
    s === 'REVIEWED' ||
    s === 'COMPLETED' ||
    s === 'SUBMITTED' ||
    s === 'IN_PROGRESS' ||
    s === 'ASSIGNED'
  ) {
    return s;
  }
  return 'NONE';
}

function StatusBadge({ statusKey }: { statusKey: StatusKey }) {
  const cfg = STATUS_CONFIG[statusKey];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.chipClass}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} aria-hidden />
      {cfg.label}
    </span>
  );
}

function stripRoundSuffix(title: string): string {
  return title.replace(/\s*-\s*R\d+\s*$/i, '').trim();
}

function RowContent({
  video,
  count,
}: {
  video: VideoOption;
  count: number | null;
}) {
  const statusKey = getStatusKey(video);
  return (
    <div className="flex items-start justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <div className="text-sm text-foreground truncate">
          {stripRoundSuffix(video.title) || video.title}
        </div>
        <div className="text-xs text-foreground-tertiary mt-0.5">
          Round {video.round}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <StatusBadge statusKey={statusKey} />
        <span className="text-xs tabular-nums text-foreground-secondary">
          {count === null ? (
            <span className="text-foreground-tertiary">…</span>
          ) : count === 0 ? (
            <span className="text-zinc-500 italic">no events</span>
          ) : (
            <>
              {count} {count === 1 ? 'event' : 'events'}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

interface RoundPickerProps {
  options: VideoOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  eventCounts: Map<string, number | null>;
  loading?: boolean;
}

function RoundPicker({
  options,
  selectedId,
  onSelect,
  eventCounts,
  loading,
}: RoundPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    const arr = [...options];
    arr.sort((a, b) => {
      const t = (a.title || '').localeCompare(b.title || '');
      if (t !== 0) return t;
      return (a.round ?? 0) - (b.round ?? 0);
    });
    return arr;
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((v) => {
      const title = (v.title || '').toLowerCase();
      const b1 = (v.boxer1 || '').toLowerCase();
      const b2 = (v.boxer2 || '').toLowerCase();
      const r = String(v.round ?? '');
      return (
        title.includes(q) ||
        b1.includes(q) ||
        b2.includes(q) ||
        r === q ||
        `r${r}` === q ||
        `round ${r}` === q ||
        title.includes(q)
      );
    });
  }, [sorted, query]);

  const selected = useMemo(
    () => options.find((v) => v.id === selectedId) ?? null,
    [options, selectedId]
  );

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(
      `[data-idx="${highlight}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(Math.max(0, filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const v = filtered[highlight];
      if (v) {
        onSelect(v.id);
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-left hover:bg-surface/70 focus:outline-none focus:border-accent-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          {loading ? (
            <span className="text-foreground-tertiary text-sm">
              Loading rounds...
            </span>
          ) : selected ? (
            <RowContent
              video={selected}
              count={eventCounts.get(selected.id) ?? null}
            />
          ) : (
            <span className="text-foreground-tertiary text-sm">
              Select a round
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-foreground-secondary transition-transform shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          ref={popoverRef}
          onKeyDown={handleKeyDown}
          className="absolute z-30 mt-2 w-full bg-surface border border-border/70 rounded-lg shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-border/50">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary pointer-events-none"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="text"
                role="searchbox"
                aria-label="Search rounds"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by fight, boxer, or round..."
                className="w-full bg-surface/50 border border-border/50 rounded p-2 pl-8 text-sm text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-primary/50"
              />
            </div>
          </div>
          <div
            ref={listRef}
            role="listbox"
            aria-label="Available rounds"
            className="max-h-80 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-foreground-tertiary text-center">
                No rounds match.
              </div>
            ) : (
              filtered.map((v, idx) => {
                const count = eventCounts.get(v.id);
                const isEmpty = count === 0;
                const isHi = idx === highlight;
                const isSel = v.id === selectedId;
                const ariaCount =
                  count === null || count === undefined
                    ? 'unknown'
                    : `${count}`;
                return (
                  <button
                    key={v.id}
                    data-idx={idx}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    aria-label={`${stripRoundSuffix(v.title) || v.title}, Round ${v.round}, ${STATUS_CONFIG[getStatusKey(v)].label}, ${ariaCount} events`}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => {
                      onSelect(v.id);
                      setOpen(false);
                      buttonRef.current?.focus();
                    }}
                    className={[
                      'w-full text-left px-3 py-2.5 cursor-pointer transition-colors flex items-center gap-3',
                      isHi ? 'bg-surface/80' : 'hover:bg-surface/60',
                      isSel
                        ? 'border-l-2 border-emerald-500'
                        : 'border-l-2 border-transparent',
                      isEmpty ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <div className="flex-1 min-w-0">
                      <RowContent video={v} count={count ?? null} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function triggerDownload(
  path: string,
  params: URLSearchParams,
  fallbackFilename: string,
  onEmptyConfirm?: (rowCount: number) => Promise<boolean> | boolean
) {
  const url0 = `${path}?${params}`;
  console.log('[ROUND-EXPORT client] FETCH', url0);
  const response = await fetch(url0, { cache: 'no-store' });
  console.log(
    '[ROUND-EXPORT client] RESP status=',
    response.status,
    'cache-control=',
    response.headers.get('Cache-Control'),
    'content-disposition=',
    response.headers.get('Content-Disposition')
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to export events');
  }
  const blob = await response.blob();
  console.log('[ROUND-EXPORT client] BLOB bytes=', blob.size);

  // Empty-CSV safety net (client-side). Confirms before saving an empty file.
  if (onEmptyConfirm) {
    const text = await blob.text();
    const dataLines =
      text.split('\n').filter((l) => l.trim()).length - 1;
    const proceed = await onEmptyConfirm(Math.max(0, dataLines));
    if (!proceed) {
      console.log('[ROUND-EXPORT client] CANCELLED by user (empty)');
      return;
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = fallbackFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) filename = match[1];
  }
  console.log('[ROUND-EXPORT client] SAVE filename=', filename);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delayed revoke: Safari/WebKit downloads the blob asynchronously after click().
  // Synchronous revokeObjectURL kills the blob before the save completes, producing
  // "WebKitBlobResource error 1". Chrome/Firefox are unaffected. The 1s delay lets
  // every browser finish initiating the download safely.
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export default function ExportReportsSection() {
  // All events export state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QC export state
  const [qcStartDate, setQcStartDate] = useState<Date | null>(null);
  const [qcEndDate, setQcEndDate] = useState<Date | null>(null);
  const [qcTimezone, setQcTimezone] = useState('UTC');
  const [qcUserEmail, setQcUserEmail] = useState<string>('all');
  const [qcLoading, setQcLoading] = useState(false);
  const [qcError, setQcError] = useState<string | null>(null);
  const [qcUsers, setQcUsers] = useState<QCUser[]>([]);
  const [qcUsersLoading, setQcUsersLoading] = useState(true);

  // Round export state
  const [videoOptions, setVideoOptions] = useState<VideoOption[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [roundLoading, setRoundLoading] = useState(false);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [eventCounts, setEventCounts] = useState<Map<string, number | null>>(
    new Map()
  );

  useEffect(() => {
    async function fetchQCUsers() {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const data = await res.json();
        setQcUsers(data.users as QCUser[]);
      } catch {
        // silently fail — dropdown still works with just "All QC Users"
      } finally {
        setQcUsersLoading(false);
      }
    }
    fetchQCUsers();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function preloadEventCounts(videos: VideoOption[]) {
      const initial = new Map<string, number | null>();
      videos.forEach((v) => initial.set(v.id, null));
      if (cancelled) return;
      setEventCounts(initial);

      const concurrency = 6;
      const queue = [...videos];

      async function worker() {
        while (queue.length && !cancelled) {
          const v = queue.shift();
          if (!v) return;
          try {
            const r = await fetch(`/api/videos/${v.id}/events`, {
              cache: 'no-store',
            });
            if (!r.ok) continue;
            const json = await r.json();
            const count = Array.isArray(json.events) ? json.events.length : 0;
            if (cancelled) return;
            setEventCounts((prev) => {
              const next = new Map(prev);
              next.set(v.id, count);
              return next;
            });
          } catch {
            // leave as null on error
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, () => worker()));
    }

    async function fetchVideos() {
      try {
        const res = await fetch('/api/videos');
        if (!res.ok) return;
        const data = await res.json();
        const options: VideoOption[] = (data.videos ?? []).map(
          (v: VideoOption) => ({
            id: v.id,
            title: v.title,
            round: v.round,
            boxer1: v.boxer1,
            boxer2: v.boxer2,
            fightDate: v.fightDate,
            assignments: v.assignments,
          })
        );
        if (cancelled) return;
        setVideoOptions(options);
        preloadEventCounts(options);
      } catch {
        // silently fail — picker will be empty
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    }
    fetchVideos();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedVideo = videoOptions.find((v) => v.id === selectedVideoId);
  const selectedStatusKey: StatusKey = selectedVideo
    ? getStatusKey(selectedVideo)
    : 'NONE';
  const selectedCount = selectedVideoId
    ? eventCounts.get(selectedVideoId)
    : undefined;
  const showPartialWarning =
    !!selectedVideo &&
    (selectedStatusKey === 'ASSIGNED' || selectedStatusKey === 'IN_PROGRESS');
  const showEmptyWarning = !!selectedVideo && selectedCount === 0;

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    if (startDate > endDate) {
      setError('Start date must be before end date');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endOfDay.toISOString(),
        timezone,
        exportType: 'all',
      });
      await triggerDownload(
        '/api/admin/export-events',
        params,
        `events-export-${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoundExport = async () => {
    if (!selectedVideoId) {
      setRoundError('Please select a round');
      return;
    }
    const picked = videoOptions.find((v) => v.id === selectedVideoId);
    console.log(
      '[ROUND-EXPORT client] CLICK selectedVideoId=',
      selectedVideoId,
      'picked.title=',
      picked?.title,
      'picked.round=',
      picked?.round
    );
    setRoundError(null);
    setRoundLoading(true);
    try {
      const params = new URLSearchParams({ videoId: selectedVideoId });
      await triggerDownload(
        '/api/admin/export-events/round',
        params,
        'round-export.csv',
        async (rowCount) => {
          if (rowCount > 0) return true;
          const ok = window.confirm(
            `${picked?.title ?? 'This round'} has no events tagged yet.\n\nExport an empty CSV anyway?`
          );
          return ok;
        }
      );
    } catch (err) {
      setRoundError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setRoundLoading(false);
    }
  };

  const handleQCExport = async () => {
    if (!qcStartDate || !qcEndDate) {
      setQcError('Please select both start and end dates');
      return;
    }
    if (qcStartDate > qcEndDate) {
      setQcError('Start date must be before end date');
      return;
    }
    setQcError(null);
    setQcLoading(true);
    try {
      const endOfDay = new Date(qcEndDate);
      endOfDay.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        startDate: qcStartDate.toISOString(),
        endDate: endOfDay.toISOString(),
        timezone: qcTimezone,
        exportType: 'qc',
      });
      if (qcUserEmail !== 'all') {
        params.set('qcUserEmail', qcUserEmail);
      }
      await triggerDownload(
        '/api/admin/export-events',
        params,
        `qc-changes-${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (err) {
      setQcError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setQcLoading(false);
    }
  };

  const exportButtonLabel =
    selectedCount && selectedCount > 0
      ? `Export ${selectedCount} ${selectedCount === 1 ? 'event' : 'events'}`
      : 'Export Round CSV';

  return (
    <div className="space-y-6 pt-6 border-t border-border/50">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-medium text-foreground">Export Reports</h3>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-primary/20 text-accent-primary border border-accent-primary/30 uppercase tracking-wide">
          Admin
        </span>
      </div>

      {/* All Events Export */}
      <div className="bg-surface/30 border border-border/50 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2 bg-accent-primary/10 rounded-lg mt-1">
            <FileDown size={20} className="text-accent-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">Export Events</h4>
            <p className="text-sm text-foreground-tertiary">
              Export all events created within a date range to CSV
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
              Start Date
            </label>
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={new Date()}
                placeholderText="Select start date"
                className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 pr-10 text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-primary/50"
                dateFormat="MMM d, yyyy"
              />
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
              End Date
            </label>
            <div className="relative">
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                maxDate={new Date()}
                placeholderText="Select end date"
                className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 pr-10 text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-primary/50"
                dateFormat="MMM d, yyyy"
              />
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-foreground focus:outline-none focus:border-accent-primary/50 appearance-none cursor-pointer"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading || !startDate || !endDate}
          className="px-6 py-3 bg-accent-primary hover:bg-accent-primary/80 disabled:bg-accent-primary/30 cursor-pointer disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" />Exporting...</>
          ) : (
            <><FileDown size={18} />Export CSV</>
          )}
        </button>
      </div>

      {/* QC Changes Export */}
      <div className="bg-surface/30 border border-border/50 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2 bg-amber-500/10 rounded-lg mt-1">
            <ShieldCheck size={20} className="text-amber-500" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">Export QC Changes</h4>
            <p className="text-sm text-foreground-tertiary">
              Export events modified during Quality Control review — where the reviewer differs from the original labeler
            </p>
          </div>
        </div>

        {/* QC User Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
            QC Reviewer
          </label>
          <select
            value={qcUserEmail}
            onChange={(e) => setQcUserEmail(e.target.value)}
            disabled={qcUsersLoading}
            className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-foreground focus:outline-none focus:border-accent-primary/50 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All QC Reviewers</option>
            {qcUsers.map((u) => (
              <option key={u.id} value={u.email}>
                {u.username} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
              Start Date
            </label>
            <div className="relative">
              <DatePicker
                selected={qcStartDate}
                onChange={(date: Date | null) => setQcStartDate(date)}
                selectsStart
                startDate={qcStartDate}
                endDate={qcEndDate}
                maxDate={new Date()}
                placeholderText="Select start date"
                className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 pr-10 text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-primary/50"
                dateFormat="MMM d, yyyy"
              />
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
              End Date
            </label>
            <div className="relative">
              <DatePicker
                selected={qcEndDate}
                onChange={(date: Date | null) => setQcEndDate(date)}
                selectsEnd
                startDate={qcStartDate}
                endDate={qcEndDate}
                minDate={qcStartDate}
                maxDate={new Date()}
                placeholderText="Select end date"
                className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 pr-10 text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-primary/50"
                dateFormat="MMM d, yyyy"
              />
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
            Timezone
          </label>
          <select
            value={qcTimezone}
            onChange={(e) => setQcTimezone(e.target.value)}
            className="w-full bg-surface/50 border border-border/50 rounded-lg p-3 text-foreground focus:outline-none focus:border-accent-primary/50 appearance-none cursor-pointer"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        {qcError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {qcError}
          </div>
        )}

        <button
          onClick={handleQCExport}
          disabled={qcLoading || !qcStartDate || !qcEndDate}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-500/80 disabled:bg-amber-500/30 cursor-pointer disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {qcLoading ? (
            <><Loader2 size={18} className="animate-spin" />Exporting...</>
          ) : (
            <><ShieldCheck size={18} />Export QC CSV</>
          )}
        </button>
      </div>

      {/* Round Export */}
      <div className="bg-surface/30 border border-border/50 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2 bg-emerald-500/10 rounded-lg mt-1">
            <ListOrdered size={20} className="text-emerald-500" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">Export Round</h4>
            <p className="text-sm text-foreground-tertiary">
              Export every event for a single round. All labelers merged, sorted chronologically.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
            Round
          </label>
          <RoundPicker
            options={videoOptions}
            selectedId={selectedVideoId}
            onSelect={setSelectedVideoId}
            eventCounts={eventCounts}
            loading={videosLoading}
          />
        </div>

        {showPartialWarning && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" aria-hidden />
            <p className="text-sm text-amber-300">
              Labeling for this round is in progress
              <span className="opacity-80"> (status: {STATUS_CONFIG[selectedStatusKey].label})</span>
              . The CSV will reflect partial data — events not yet tagged will be missing.
            </p>
          </div>
        )}

        {showEmptyWarning && !showPartialWarning && (
          <div className="mb-4 p-3 bg-zinc-500/10 border border-zinc-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-zinc-400 mt-0.5 shrink-0" aria-hidden />
            <p className="text-sm text-zinc-300">
              This round has no events tagged yet. Exporting will produce a CSV with only headers.
            </p>
          </div>
        )}

        {roundError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {roundError}
          </div>
        )}

        <button
          onClick={handleRoundExport}
          disabled={roundLoading || !selectedVideoId}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-500/80 disabled:bg-emerald-500/30 cursor-pointer disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {roundLoading ? (
            <><Loader2 size={18} className="animate-spin" />Exporting...</>
          ) : (
            <><ListOrdered size={18} />{exportButtonLabel}</>
          )}
        </button>
      </div>
    </div>
  );
}
