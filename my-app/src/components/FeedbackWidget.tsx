'use client';

import React, { useState } from 'react';
import { MessageSquare, Lock, Send, Check, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * FeedbackWidget — "Direction B": a collapsed prompt that expands inline into a
 * short, anonymous feedback form. Designed to live in the dashboard right-rail
 * whitespace (below "In Queue"), but it's self-contained and can sit anywhere.
 *
 * Tokens used match the BR Labs theme: bg-surface, border-border,
 * text-foreground / -secondary / -tertiary, accent-primary.
 */

type Category = 'general' | 'bug' | 'idea' | 'friction';

const CATS: { k: Category; label: string; ph: string; active: string }[] = [
    { k: 'general',  label: 'General',  ph: "What's on your mind?",                 active: 'bg-blue-500/10 text-blue-400 border-blue-500/40' },
    { k: 'bug',      label: 'Bug',      ph: 'What broke? Where did it happen?',      active: 'bg-red-500/10 text-red-400 border-red-500/40' },
    { k: 'idea',     label: 'Idea',     ph: 'What would you add or change?',         active: 'bg-amber-500/10 text-amber-400 border-amber-500/40' },
    { k: 'friction', label: 'Friction', ph: 'What slowed you down or felt clunky?',  active: 'bg-purple-500/10 text-purple-400 border-purple-500/40' },
];
const RATING_LABELS = ['', 'Rough', 'Poor', 'Okay', 'Good', 'Great'];

const FeedbackWidget = () => {
    const [open, setOpen] = useState(false);
    const [cat, setCat] = useState<Category>('general');
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [text, setText] = useState('');
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const activeCat = CATS.find(c => c.k === cat)!;
    const shown = hover || rating;
    const canSend = rating > 0 || text.trim().length > 0;

    const reset = () => { setSent(false); setCat('general'); setRating(0); setText(''); };

    const submit = async () => {
        if (!canSend || submitting) return;
        setSubmitting(true);
        try {
            // Anonymous: no user id is attached. See api-feedback-route.ts for the endpoint.
            await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: cat,
                    rating: rating || null,
                    comment: text.trim() || null,
                    path: typeof window !== 'undefined' ? window.location.pathname : null,
                }),
            });
            setSent(true);
        } catch (err) {
            console.error('[Feedback] submit failed', err);
            // Optimistic: still show thanks so the user isn't blocked.
            setSent(true);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`bg-[#161616] rounded-2xl overflow-hidden border transition-colors ${open ? 'border-accent-primary/30' : 'border-border'}`}>
            {/* Collapsed prompt (always visible) */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-hover/30 transition-colors cursor-pointer"
            >
                <div className="w-[30px] h-[30px] rounded-lg bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center shrink-0">
                    <MessageSquare size={15} className="text-accent-primary" />
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                    <div className="text-sm font-semibold text-foreground">How are we doing?</div>
                    <div className="text-[10.5px] text-foreground-tertiary">
                        {open ? 'Anonymous · takes 10 seconds' : 'Tap to share feedback'}
                    </div>
                </div>
                <span className="text-foreground-tertiary">
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
            </button>

            {/* Expanded form */}
            {open && (
                <div className="px-4 pb-4">
                    <div className="h-px bg-border mb-3.5" />

                    {sent ? (
                        <div className="flex flex-col items-center gap-3 py-5">
                            <div className="w-11 h-11 rounded-full bg-green-500/10 border border-green-500/40 flex items-center justify-center">
                                <Check size={22} className="text-green-500" />
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-semibold text-foreground">Thanks, that helps.</div>
                                <div className="text-xs text-foreground-tertiary mt-0.5">Sent anonymously.</div>
                            </div>
                            <button
                                onClick={reset}
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white/5 text-foreground-secondary border border-border hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                                Send another
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {/* Category chips */}
                            <div className="flex gap-1.5 flex-wrap">
                                {CATS.map(c => {
                                    const on = c.k === cat;
                                    return (
                                        <button
                                            key={c.k}
                                            onClick={() => setCat(c.k)}
                                            className={`px-2.5 py-1 text-[11.5px] font-semibold rounded-full border transition-all cursor-pointer ${on ? c.active : 'bg-white/[0.03] text-foreground-secondary border-border hover:bg-surface-hover'}`}
                                        >
                                            {c.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Rating */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11.5px] text-foreground-secondary font-medium">How's the experience?</span>
                                    <span className={`ml-auto text-[11.5px] font-semibold min-w-[42px] text-right ${shown ? 'text-accent-primary' : 'text-zinc-600'}`}>
                                        {RATING_LABELS[shown] || '—'}
                                    </span>
                                </div>
                                <div className="flex gap-2" onMouseLeave={() => setHover(0)}>
                                    {[1, 2, 3, 4, 5].map(n => {
                                        const fill = n <= shown;
                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                aria-label={`Rate ${n}`}
                                                onMouseEnter={() => setHover(n)}
                                                onClick={() => setRating(n === rating ? 0 : n)}
                                                className={`flex-1 h-[30px] rounded-lg border flex items-center justify-center transition-all cursor-pointer ${fill ? 'bg-accent-primary/10 border-accent-primary/50' : 'bg-white/[0.03] border-border'}`}
                                            >
                                                <span className={`w-2 h-2 rounded-full transition-all ${fill ? 'bg-accent-primary' : 'bg-zinc-700'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Comment */}
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder={activeCat.ph}
                                rows={2}
                                className="w-full resize-none bg-white/[0.03] border border-border rounded-[10px] px-3 py-2.5 text-foreground text-[12.5px] leading-relaxed outline-none focus:border-accent-primary/50 transition-colors placeholder:text-foreground-tertiary"
                            />

                            {/* Footer */}
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5 text-[10.5px] text-foreground-tertiary">
                                    <Lock size={12} /> Anonymous
                                </span>
                                <button
                                    onClick={submit}
                                    disabled={!canSend || submitting}
                                    className={`ml-auto inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold rounded-[9px] transition-all ${canSend && !submitting ? 'bg-accent-primary text-white hover:bg-accent-primary/90 cursor-pointer' : 'bg-[#1f1f23] text-zinc-600 cursor-not-allowed'}`}
                                >
                                    <Send size={14} /> {submitting ? 'Sending…' : 'Send'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FeedbackWidget;
