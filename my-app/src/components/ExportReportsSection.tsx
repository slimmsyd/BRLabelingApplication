'use client';

import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { FileDown, Loader2, Calendar } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern (EST/EDT)', value: 'America/New_York' },
  { label: 'Central (CST/CDT)', value: 'America/Chicago' },
  { label: 'Mountain (MST/MDT)', value: 'America/Denver' },
  { label: 'Pacific (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
];

export default function ExportReportsSection() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Set end date to end of day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endOfDay.toISOString(),
        timezone: timezone
      });

      const response = await fetch(`/api/admin/export-events?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export events');
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `events-export-${new Date().toISOString().split('T')[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
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
          {/* Start Date */}
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

          {/* End Date */}
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

        {/* Timezone */}
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
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={loading || !startDate || !endDate}
          className="px-6 py-3 bg-accent-primary hover:bg-accent-primary/80 disabled:bg-accent-primary/30 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown size={18} />
              Export CSV
            </>
          )}
        </button>
      </div>
    </div>
  );
}
