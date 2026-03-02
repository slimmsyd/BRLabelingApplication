'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { FileDown, Loader2, Calendar, ShieldCheck } from 'lucide-react';
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

async function triggerDownload(
  params: URLSearchParams,
  fallbackFilename: string
) {
  const response = await fetch(`/api/admin/export-events?${params}`);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to export events');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = fallbackFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) filename = match[1];
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
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
      await triggerDownload(params, `events-export-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
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
      await triggerDownload(params, `qc-changes-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      setQcError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setQcLoading(false);
    }
  };

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
          className="px-6 py-3 bg-accent-primary hover:bg-accent-primary/80 disabled:bg-accent-primary/30 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
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
          className="px-6 py-3 bg-amber-500 hover:bg-amber-500/80 disabled:bg-amber-500/30 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {qcLoading ? (
            <><Loader2 size={18} className="animate-spin" />Exporting...</>
          ) : (
            <><ShieldCheck size={18} />Export QC CSV</>
          )}
        </button>
      </div>
    </div>
  );
}
