import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AgentTraitsSchema,
  DEFAULT_EYES_FAMILY,
  DEFAULT_MOUTH_FAMILY,
  EYE_FAMILIES,
  EYE_FAMILY_LABELS,
  MOOD_KEYS,
  MOODS,
  MOUTH_FAMILIES,
  MOUTH_FAMILY_LABELS,
  type AgentTraits,
  type EyeFamily,
  type MoodKey,
  type MouthFamily,
} from '@shared/moods';
import type { Agent } from '@shared/types';
import { api } from '../lib/api';
import { Face } from './Face';

interface MugBuilderProps {
  agent: Agent;
  ownerToken: string;
  onSaved: (agent: Agent) => void;
  onDismiss: () => void;
}

const STARTING_DEFAULTS: AgentTraits = {
  v: 2,
  eyesFamily: DEFAULT_EYES_FAMILY,
  mouthFamily: DEFAULT_MOUTH_FAMILY,
};

// Auto-cycle through moods every ~1.8s to keep the hero alive. Users can lock
// onto a single mood by tapping a thumbnail in the mood scrub strip; we resume
// auto-cycling when they tap AUTO.
const HERO_CYCLE_MS = 1800;

export function MugBuilder({ agent, ownerToken, onSaved, onDismiss }: MugBuilderProps) {
  const starting = agent.traits ?? STARTING_DEFAULTS;
  const [eyesFamily, setEyesFamily] = useState<EyeFamily>(starting.eyesFamily);
  const [mouthFamily, setMouthFamily] = useState<MouthFamily>(starting.mouthFamily);
  const [color, setColor] = useState<string>(agent.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hero animation: either rotates through moods automatically, or stays
  // locked on a user-chosen one. `lockedMood = null` means auto-cycle.
  const [lockedMood, setLockedMood] = useState<MoodKey | null>(null);
  const [autoIndex, setAutoIndex] = useState(0);

  useEffect(() => {
    if (lockedMood) return;
    const id = setInterval(() => {
      setAutoIndex((i) => (i + 1) % MOOD_KEYS.length);
    }, HERO_CYCLE_MS);
    return () => clearInterval(id);
  }, [lockedMood]);

  const heroMood: MoodKey = lockedMood ?? MOOD_KEYS[autoIndex]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onDismiss]);

  const traits: AgentTraits = useMemo(
    () => ({ v: 2, eyesFamily, mouthFamily }),
    [eyesFamily, mouthFamily],
  );

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const parsed = AgentTraitsSchema.parse(traits);
      const result = await api.updateAgent(
        agent.id,
        { traits: parsed, color },
        ownerToken,
      );
      onSaved(result.agent);
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset this mug to the built-in face? The customization will be cleared.')) return;
    setError(null);
    setSaving(true);
    try {
      const result = await api.updateAgentTraits(agent.id, null, ownerToken);
      onSaved(result.agent);
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mug-builder-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <section className="bg-paper text-ink border-[3px] border-ink rounded-none sm:rounded-2xl shadow-brutal w-full sm:max-w-2xl max-h-screen sm:max-h-[95vh] flex flex-col">
        <header className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b-[3px] border-ink shrink-0">
          <h2
            id="mug-builder-title"
            className="font-display text-sm sm:text-base tracking-widest truncate"
          >
            ▸ CUSTOMIZE {agent.name.toUpperCase()}
          </h2>
          <button
            onClick={onDismiss}
            className="font-display text-lg leading-none border-2 border-ink rounded px-2 py-0.5 hover:bg-ink hover:text-paper shrink-0"
            aria-label="Close builder"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto">
          {/* HERO — big animated face cycling through moods */}
          <div className="px-3 sm:px-6 pt-4 pb-2 bg-paper">
            <div className="relative mx-auto" style={{ maxWidth: 'min(72vw, 320px)' }}>
              <div className="aspect-square">
                <Face
                  mood={heroMood}
                  color={color}
                  name=""
                  traits={traits}
                  muted
                  volume={0}
                  compact
                />
              </div>
              {/* Mood label + auto/lock toggle */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="font-display text-[11px] sm:text-xs tracking-widest opacity-80">
                  {MOODS[heroMood].label.toUpperCase()}
                </span>
                {lockedMood && (
                  <button
                    type="button"
                    onClick={() => setLockedMood(null)}
                    className="font-display text-[9px] tracking-widest border-2 border-ink rounded-full px-2 py-0.5 bg-accent-yellow shadow-brutal-sm"
                  >
                    AUTO ↻
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MOOD SCRUB — 12 small thumbnails to drive the hero */}
          <MoodScrubStrip
            traits={traits}
            color={color}
            activeMood={heroMood}
            onPick={(m) => setLockedMood(m)}
          />

          {/* FAMILY CAROUSELS */}
          <FamilyCarousel
            label="Eyes"
            families={EYE_FAMILIES}
            labels={EYE_FAMILY_LABELS}
            value={eyesFamily}
            onChange={setEyesFamily}
            renderTile={(family) => (
              <Face
                mood="idle"
                color={color}
                name=""
                traits={{ v: 2, eyesFamily: family, mouthFamily }}
                muted
                volume={0}
                compact
              />
            )}
          />

          <FamilyCarousel
            label="Mouth"
            families={MOUTH_FAMILIES}
            labels={MOUTH_FAMILY_LABELS}
            value={mouthFamily}
            onChange={setMouthFamily}
            renderTile={(family) => (
              <Face
                mood="happy"
                color={color}
                name=""
                traits={{ v: 2, eyesFamily, mouthFamily: family }}
                muted
                volume={0}
                compact
              />
            )}
          />

          {/* COLOR */}
          <div className="px-3 sm:px-6 pb-4 pt-2 flex items-center gap-3 flex-wrap">
            <span className="font-display text-[10px] tracking-widest opacity-80">COLOR</span>
            <label className="cursor-pointer">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 border-[2.5px] border-ink rounded-lg cursor-pointer"
                aria-label="Pick personality color"
              />
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
                  setColor(v.startsWith('#') ? v : `#${v}`);
                }
              }}
              className="font-mono text-sm border-[2.5px] border-ink rounded-lg px-3 py-2 w-28 bg-white"
              placeholder="#5599DD"
              aria-label="Color hex"
            />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 p-3 sm:p-4 border-t-[3px] border-ink shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || agent.traits === null}
            className="font-display text-[10px] tracking-widest border-2 border-ink rounded px-3 py-2 bg-paper shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            RESET
          </button>
          {error && <p className="text-red-700 text-xs flex-1 min-w-0 truncate">{error}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onDismiss}
              disabled={saving}
              className="font-display text-[10px] tracking-widest border-2 border-ink rounded px-3 py-2 bg-paper shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="font-display text-[10px] tracking-widest border-2 border-ink rounded px-4 py-2 bg-accent-pink shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50"
            >
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

// -- subcomponents ---------------------------------------------------------

interface MoodScrubStripProps {
  traits: AgentTraits;
  color: string;
  activeMood: MoodKey;
  onPick: (mood: MoodKey) => void;
}

// Horizontal strip of all 12 moods. Tapping one locks the hero on that mood;
// the strip auto-scrolls to keep the active mood centered. Mobile-friendly:
// scroll-snap, plenty of touch target.
function MoodScrubStrip({ traits, color, activeMood, onPick }: MoodScrubStripProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Guarded for jsdom/test envs where scrollIntoView isn't implemented.
    activeBtnRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeMood]);

  return (
    <div className="px-3 sm:px-6 pb-3">
      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-3 sm:-mx-6 px-3 sm:px-6"
        style={{ scrollbarWidth: 'thin' }}
      >
        {MOOD_KEYS.map((m) => {
          const active = m === activeMood;
          return (
            <button
              key={m}
              ref={active ? activeBtnRef : undefined}
              type="button"
              onClick={() => onPick(m)}
              aria-pressed={active}
              aria-label={`Show ${MOODS[m].label}`}
              className={`snap-center shrink-0 w-14 sm:w-16 border-[2.5px] border-ink rounded-lg p-0.5 bg-paper shadow-brutal-sm transition ${
                active
                  ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper -translate-y-[1px]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div className="aspect-square pointer-events-none">
                <Face
                  mood={m}
                  color={color}
                  name=""
                  traits={traits}
                  muted
                  volume={0}
                  compact
                />
              </div>
              <div className="text-center text-[8px] sm:text-[9px] tracking-wider font-display truncate px-0.5">
                {MOODS[m].label.toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface FamilyCarouselProps<F extends string> {
  label: string;
  families: readonly F[];
  labels: Record<F, string>;
  value: F;
  onChange: (family: F) => void;
  renderTile: (family: F) => React.ReactNode;
}

// Horizontal scroll-snap carousel of family tiles with prev/next buttons for
// pointer users (touch users just swipe). Scales to any number of families:
// the strip just gets longer. Each tile is a live mini-Face so the owner sees
// the family applied to their current color/other-axis selection.
function FamilyCarousel<F extends string>({
  label,
  families,
  labels,
  value,
  onChange,
  renderTile,
}: FamilyCarouselProps<F>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef(new Map<F, HTMLButtonElement>());

  // Keep the active tile centered when the family changes (incl. arrow taps).
  useEffect(() => {
    tileRefs.current.get(value)?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [value]);

  const stepBy = (dir: -1 | 1) => {
    const idx = families.indexOf(value);
    const next = families[(idx + dir + families.length) % families.length]!;
    onChange(next);
  };

  return (
    <div className="px-3 sm:px-6 pb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-[10px] tracking-widest opacity-80 uppercase">{label}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => stepBy(-1)}
            aria-label={`Previous ${label} family`}
            className="font-display text-xs leading-none w-7 h-7 grid place-items-center border-2 border-ink rounded bg-paper shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
          >
            ◂
          </button>
          <button
            type="button"
            onClick={() => stepBy(1)}
            aria-label={`Next ${label} family`}
            className="font-display text-xs leading-none w-7 h-7 grid place-items-center border-2 border-ink rounded bg-paper shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
          >
            ▸
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-3 sm:-mx-6 px-3 sm:px-6"
        style={{ scrollbarWidth: 'thin' }}
      >
        {families.map((family) => {
          const active = family === value;
          return (
            <button
              key={family}
              ref={(el) => {
                if (el) tileRefs.current.set(family, el);
                else tileRefs.current.delete(family);
              }}
              type="button"
              onClick={() => onChange(family)}
              aria-pressed={active}
              className={`snap-center shrink-0 w-28 sm:w-32 border-[2.5px] border-ink rounded-lg p-2 bg-paper shadow-brutal-sm transition ${
                active
                  ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper -translate-x-[1px] -translate-y-[1px]'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className="aspect-square pointer-events-none">{renderTile(family)}</div>
              <div className="text-center text-[10px] mt-1 tracking-wider font-display">
                {labels[family].toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
