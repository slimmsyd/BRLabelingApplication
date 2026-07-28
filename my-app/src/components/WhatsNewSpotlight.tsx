'use client';

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasSeenWhatsNew, markWhatsNewSeen } from '@/lib/whats-new';

export interface WhatsNewStep {
  title: string;
  body: string;
  targetRef: React.RefObject<HTMLElement | null>;
}

interface WhatsNewSpotlightProps {
  featureId: string;
  /** One or more steps (e.g. form control, then list filter). */
  steps: WhatsNewStep[];
  /** Delay before first paint so layout/refs settle */
  delayMs?: number;
}

const PADDING = 8;
const POPOVER_GAP = 12;

function measureTarget(ref: React.RefObject<HTMLElement | null>): DOMRect | null {
  const el = ref.current;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  return r;
}

/**
 * One-shot multi-step spotlight: dims the page, rings each target, tip card.
 * Finishing the last step (or Esc / backdrop) marks the feature seen permanently.
 */
export default function WhatsNewSpotlight({
  featureId,
  steps,
  delayMs = 400,
}: WhatsNewSpotlightProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const validSteps = steps.filter(Boolean);
  const step = validSteps[stepIndex];
  const isLast = stepIndex >= validSteps.length - 1;

  const finish = useCallback(() => {
    markWhatsNewSeen(featureId);
    setActive(false);
  }, [featureId]);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [isLast, finish]);

  // Start tour once if not seen
  useEffect(() => {
    if (hasSeenWhatsNew(featureId) || validSteps.length === 0) return;

    const timer = window.setTimeout(() => {
      // Find first step with a measurable target
      let start = 0;
      for (let i = 0; i < validSteps.length; i++) {
        const el = validSteps[i].targetRef.current;
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          start = i;
          break;
        }
      }
      setStepIndex(start);
      window.setTimeout(() => {
        const r = measureTarget(validSteps[start]?.targetRef);
        if (!r) return;
        setRect(r);
        setActive(true);
      }, 280);
    }, delayMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per feature mount
  }, [featureId, delayMs]);

  // When step changes, scroll + remeasure
  useEffect(() => {
    if (!active || !step) return;

    const el = step.targetRef.current;
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    const t = window.setTimeout(() => {
      setRect(measureTarget(step.targetRef));
    }, 280);
    return () => window.clearTimeout(t);
  }, [active, stepIndex, step]);

  // Keep highlight aligned on resize / scroll while open
  useLayoutEffect(() => {
    if (!active || !step) return;

    const update = () => {
      const r = measureTarget(step.targetRef);
      if (r) setRect(r);
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, step, stepIndex]);

  // Esc skips whole tour (marks seen)
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  if (!active || !rect || !step || typeof document === 'undefined') return null;

  const hole = {
    top: Math.max(0, rect.top - PADDING),
    left: Math.max(0, rect.left - PADDING),
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  const spaceBelow = window.innerHeight - (hole.top + hole.height);
  const placeBelow = spaceBelow > 160;
  const popoverStyle: React.CSSProperties = placeBelow
    ? {
        top: hole.top + hole.height + POPOVER_GAP,
        left: Math.min(Math.max(16, hole.left), window.innerWidth - 320 - 16),
      }
    : {
        bottom: window.innerHeight - hole.top + POPOVER_GAP,
        left: Math.min(Math.max(16, hole.left), window.innerWidth - 320 - 16),
      };

  const stepLabel =
    validSteps.length > 1 ? `${stepIndex + 1} of ${validSteps.length}` : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      aria-describedby="whats-new-body"
    >
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={finish}
        aria-hidden
      >
        <div
          className="absolute left-0 right-0 bg-black/65"
          style={{ top: 0, height: hole.top }}
        />
        <div
          className="absolute left-0 right-0 bg-black/65"
          style={{ top: hole.top + hole.height, bottom: 0 }}
        />
        <div
          className="absolute bg-black/65"
          style={{
            top: hole.top,
            left: 0,
            width: hole.left,
            height: hole.height,
          }}
        />
        <div
          className="absolute bg-black/65"
          style={{
            top: hole.top,
            left: hole.left + hole.width,
            right: 0,
            height: hole.height,
          }}
        />
      </div>

      <div
        className="absolute pointer-events-none rounded-xl ring-2 ring-amber-400/90 shadow-[0_0_0_4px_rgba(245,158,11,0.2)]"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
        }}
        aria-hidden
      />

      <div
        className="absolute z-[101] w-[min(100vw-2rem,20rem)] rounded-xl border border-border bg-surface p-4 shadow-xl shadow-black/40"
        style={popoverStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p
            id="whats-new-title"
            className="text-[10px] font-bold uppercase tracking-wider text-amber-400"
          >
            {step.title}
          </p>
          {stepLabel && (
            <span className="text-[10px] text-foreground-tertiary tabular-nums shrink-0">
              {stepLabel}
            </span>
          )}
        </div>
        <p
          id="whats-new-body"
          className="text-sm text-foreground leading-relaxed mb-4"
        >
          {step.body}
        </p>
        <div className="flex gap-2">
          {validSteps.length > 1 && !isLast && (
            <button
              type="button"
              onClick={finish}
              className="px-3 py-2 rounded-lg border border-border text-foreground-secondary hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            autoFocus
            className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors cursor-pointer"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
