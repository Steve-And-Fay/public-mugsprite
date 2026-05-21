import { useEffect, useState } from 'react';
import {
  AgentTraitsSchema,
  BASE_MOUTHS,
  EYE_STYLES,
  MOOD_KEYS,
  MOODS,
  type AgentTraits,
  type BaseMouthStyle,
  type EyeStyle,
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

// Defaults match the original built-in face (idle mood traits). Choosing these
// as the starting point means an owner who opens the builder, immediately
// saves, and exits gets a face that looks identical to the built-in default —
// no surprise visual change just for opening the customizer.
const DEFAULT_TRAITS: AgentTraits = {
  v: 1,
  baseEyes: 'normal',
  baseMouth: 'gentleSmile',
};

// Labels keep the picker chips readable; technical enum values stay in code.
const EYE_LABELS: Record<EyeStyle, string> = {
  normal: 'Normal',
  happy: 'Happy',
  sad: 'Sad',
  wide: 'Wide',
  closed: 'Closed',
  lookUp: 'Up',
  narrow: 'Narrow',
  sparkle: 'Sparkle',
  asymm: 'Asymm',
  cross: 'Cross',
  x: 'X',
};

const MOUTH_LABELS: Record<BaseMouthStyle, string> = {
  gentleSmile: 'Gentle',
  bigSmile: 'Big',
  frown: 'Frown',
  openO: 'Open',
  tinyO: 'Tiny',
  flat: 'Flat',
  smirk: 'Smirk',
  wavy: 'Wavy',
};

export function MugBuilder({ agent, ownerToken, onSaved, onDismiss }: MugBuilderProps) {
  const startingTraits: AgentTraits = agent.traits ?? DEFAULT_TRAITS;
  const [eyes, setEyes] = useState<EyeStyle>(startingTraits.baseEyes);
  const [mouth, setMouth] = useState<BaseMouthStyle>(startingTraits.baseMouth);
  const [color, setColor] = useState<string>(agent.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Esc closes; lock background scroll while the modal is open.
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

  const traits: AgentTraits = { v: 1, baseEyes: eyes, baseMouth: mouth };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const parsed = AgentTraitsSchema.parse(traits);
      // Send color alongside traits so the picker actually persists. The
      // server emits separate 'color' and 'traits' events; both flow back
      // through SSE within ~1s.
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
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mug-builder-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <section className="bg-paper text-ink border-[3px] border-ink rounded-none sm:rounded-2xl shadow-brutal w-full sm:max-w-5xl max-h-screen sm:max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between gap-2 p-4 border-b-[3px] border-ink shrink-0">
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

        <div className="overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
          {/* LEFT PANE — pickers */}
          <div className="space-y-5">
            <section>
              <h3 className="font-display text-[10px] tracking-widest mb-2 opacity-80">
                EYES
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {EYE_STYLES.map((style) => {
                  const active = eyes === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setEyes(style)}
                      aria-pressed={active}
                      className={`border-[2.5px] border-ink rounded-lg p-1 bg-paper shadow-brutal-sm transition ${
                        active
                          ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper -translate-x-[1px] -translate-y-[1px]'
                          : 'hover:-translate-x-[1px] hover:-translate-y-[1px]'
                      }`}
                    >
                      <div className="aspect-square w-full pointer-events-none">
                        <Face
                          mood="idle"
                          color={color}
                          name=""
                          traits={{ v: 1, baseEyes: style, baseMouth: mouth }}
                          muted
                          volume={0}
                        />
                      </div>
                      <div className="text-center text-[9px] mt-1 tracking-wider font-display">
                        {EYE_LABELS[style]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="font-display text-[10px] tracking-widest mb-2 opacity-80">
                MOUTH
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {BASE_MOUTHS.map((style) => {
                  const active = mouth === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setMouth(style)}
                      aria-pressed={active}
                      className={`border-[2.5px] border-ink rounded-lg p-1 bg-paper shadow-brutal-sm transition ${
                        active
                          ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper -translate-x-[1px] -translate-y-[1px]'
                          : 'hover:-translate-x-[1px] hover:-translate-y-[1px]'
                      }`}
                    >
                      <div className="aspect-square w-full pointer-events-none">
                        <Face
                          mood="idle"
                          color={color}
                          name=""
                          traits={{ v: 1, baseEyes: eyes, baseMouth: style }}
                          muted
                          volume={0}
                        />
                      </div>
                      <div className="text-center text-[9px] mt-1 tracking-wider font-display">
                        {MOUTH_LABELS[style]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="font-display text-[10px] tracking-widest mb-2 opacity-80">
                COLOR
              </h3>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-12 border-[2.5px] border-ink rounded-lg cursor-pointer"
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
                  className="font-mono text-sm border-[2.5px] border-ink rounded-lg px-3 py-2 w-32 bg-white"
                  placeholder="#5599DD"
                  aria-label="Color hex"
                />
                <p className="text-[10px] opacity-60 leading-tight">
                  The personality color saves with this character.
                </p>
              </div>
            </section>
          </div>

          {/* RIGHT PANE — 12-mood preview */}
          <div>
            <h3 className="font-display text-[10px] tracking-widest mb-2 opacity-80">
              PREVIEW · ALL 12 MOODS
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MOOD_KEYS.map((moodKey) => (
                <div key={moodKey} className="space-y-1">
                  <div className="aspect-square">
                    <Face
                      mood={moodKey}
                      color={color}
                      name=""
                      traits={traits}
                      muted
                      volume={0}
                    />
                  </div>
                  <div className="text-center text-[9px] font-display tracking-wider opacity-70">
                    {MOODS[moodKey].label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 p-4 border-t-[3px] border-ink shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || agent.traits === null}
              className="font-display text-[10px] tracking-widest border-2 border-ink rounded px-3 py-2 bg-paper shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              RESET TO BUILT-IN
            </button>
            {error && <p className="text-red-700 text-xs">{error}</p>}
          </div>
          <div className="flex items-center gap-2">
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
              className="font-display text-[10px] tracking-widest border-2 border-ink rounded px-3 py-2 bg-accent-pink shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50"
            >
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
