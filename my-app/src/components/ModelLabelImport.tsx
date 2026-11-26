'use client';

import React, { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

interface ReplacedLabeler {
  username: string;
  email: string | null;
  labelType: string;
  count: number;
}

interface FightPreview {
  videoId: string;
  title: string;
  round: number;
  labelTypes: string[];
  labeledBy: string[];
  incoming: number;
  replaced: number;
  replacedBy: ReplacedLabeler[];
}

interface PreviewResponse {
  preview: true;
  totalIncoming: number;
  totalReplaced: number;
  fights: FightPreview[];
}

export function ModelLabelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<'check' | 'import' | null>(null);

  const resetResult = () => {
    setPreview(null);
    setError(null);
    setSuccess(null);
  };

  const postFile = async (confirm: boolean) => {
    if (!file) return;
    setBusy(confirm ? 'import' : 'check');
    setError(null);
    setSuccess(null);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('confirm', confirm ? 'true' : 'false');
      if (confirm && preview) body.set('expectedReplaced', String(preview.totalReplaced));
      const response = await fetch('/api/admin/model-labels', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) {
        setPreview(null);
        setError(data.error || 'Import failed. Nothing was imported.');
        return;
      }
      if (!confirm) {
        setPreview(data as PreviewResponse);
        return;
      }
      const names = (data.fights as FightPreview[]).map((fight) => fight.labeledBy.join(', ')).join('; ');
      setSuccess(
        `Imported ${data.imported} labels as ${names || 'the model'}. Replaced ${data.replaced}. They are in the QC queue.`,
      );
      setPreview(null);
      setFile(null);
    } catch {
      setError('Import failed. Nothing was imported.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4 pt-6 border-t border-border/50">
      <div>
        <h3 className="text-lg font-medium text-foreground">Import model labels</h3>
        <p className="text-sm text-foreground-tertiary mt-1">
          Upload a model CSV for a fight that is already in the app. Labels are saved as the CSV&apos;s labeled-by name
          (for example Modelv18) on a model account, and they show up in the QC queue like any other submission.
          Hand, result, and target are stored as L/R, I/M, and Head/Body.
        </p>
      </div>

      <div className="bg-surface/40 border border-border rounded-xl p-5 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
          Model label CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-2 block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              resetResult();
            }}
          />
        </label>

        <button
          type="button"
          disabled={!file || busy !== null}
          onClick={() => postFile(false)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {busy === 'check' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Check fight
        </button>

        {preview && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            {preview.fights.map((fight) => (
              <div key={fight.videoId} className="text-sm text-foreground space-y-1">
                <p className="font-medium">{fight.title} · round {fight.round}</p>
                <p className="text-foreground-secondary">
                  {fight.incoming} labels from {fight.labeledBy.join(', ')} ({fight.labelTypes.join(', ')}).
                </p>
                {fight.replaced > 0 ? (
                  <p>
                    This replaces {fight.replaced} existing {fight.replaced === 1 ? 'label' : 'labels'}
                    {fight.replacedBy.length > 0 && (
                      <> ({fight.replacedBy.map((item) => `${item.username} ${item.count}`).join(', ')})</>
                    )}
                    . The fight is updated in one step, so a failed import does not leave it half-cleared.
                  </p>
                ) : (
                  <p>No existing labels of this type on the fight. These will be added and sent to QC.</p>
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => postFile(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-40 cursor-pointer"
            >
              {busy === 'import' && <Loader2 size={16} className="animate-spin" />}
              {preview.totalReplaced > 0
                ? `Replace ${preview.totalReplaced} labels`
                : `Import ${preview.totalIncoming} labels`}
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 whitespace-pre-wrap">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-400">{success}</p>
        )}
      </div>
    </section>
  );
}
