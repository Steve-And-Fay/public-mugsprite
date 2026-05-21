import { useEffect, useState } from 'react';
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

export function MugBuilder({ agent, ownerToken, onSaved, onDismiss }: MugBuilderProps) {
  const starting = agent.traits ?? STARTING_DEFAULTS;
  const [eyesFamily, setEyesFamily] = useState<EyeFamily>(starting.eyesFamily);
  const [mouthFamily, setMouthFamily] = useState<MouthFamily>(starting.mouthFamily);
  const [color, setColor] = useState<string>(agent.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const traits: AgentTraits = { v: 2, eyesFamily, mouthFamily };

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
          {/* LEFT — family pickers */}
          <div className="space-y-5">
            <section>
              <h3 className="font-display text-[10px] tracking-widest mb-2 opacity-80">
                EYE FAMILY
              </h3>
              <p className="text-[11px] opacity-70 mb-3 leading-snug">
                Pick a style — every mood expression inherits the family's look.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EYE_FAMILIES.map((family) => {
                  const active = eyesFamily === family;
                  return (
                    <button
                      key={family}
                      type="button"
                      onClick={() => setEyesFamily(family)}
                      aria-pressed={active}
                      className={`border-[2.5px] border-ink rounded-lg p-2 bg-paper shadow-brutal-sm transition ${
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
                          traits={{ v: 2, eyesFamily: family, mouthFamily }}
                          muted
                          volume={0}
                          compact
                        />
                      </div>
                      <div className="text-center text-[10px] mt-1 tracking-wider font-display">
                        {EYE_FAMILY_LABELS[family].toUpperCase()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="font-display text-[10px] tracking-widest mb-2 opacity-80">
                MOUTH FAMILY
              </h3>
              <p className="text-[11px] opacity-70 mb-3 leading-snug">
                Pick a style — every mood's mouth shape inherits the family's look.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MOUTH_FAMILIES.map((family) => {
                  const active = mouthFamily === family;
                  return (
                    <button
                      key={family}
                      type="button"
                      onClick={() => setMouthFamily(family)}
                      aria-pressed={active}
                      className={`border-[2.5px] border-ink rounded-lg p-2 bg-paper shadow-brutal-sm transition ${
                        active
                          ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper -translate-x-[1px] -translate-y-[1px]'
                          : 'hover:-translate-x-[1px] hover:-translate-y-[1px]'
                      }`}
                    >
                      <div className="aspect-square w-full pointer-events-none">
                        <Face
                          mood="happy"
                          color={color}
                          name=""
                          traits={{ v: 2, eyesFamily, mouthFamily: family }}
                          muted
                          volume={0}
                          compact
                        />
                      </div>
                      <div className="text-center text-[10px] mt-1 tracking-wider font-display">
                        {MOUTH_FAMILY_LABELS[family].toUpperCase()}
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

          {/* RIGHT — 12-mood preview proves the family carries through */}
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
                      compact
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
