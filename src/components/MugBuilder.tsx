import { useEffect, useMemo, useState } from 'react';
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

// Tabs are the scaling primitive — every new customization category (face
// shape, accessories, pattern) becomes a new tab without restructuring the
// rest of the UI. Keep TAB_IDS in lockstep with what the tab content switch
// below handles.
const TAB_IDS = ['eyes', 'mouth', 'color'] as const;
type TabId = (typeof TAB_IDS)[number];
const TAB_LABELS: Record<TabId, string> = {
  eyes: 'Eyes',
  mouth: 'Mouth',
  color: 'Color',
};

export function MugBuilder({ agent, ownerToken, onSaved, onDismiss }: MugBuilderProps) {
  const starting = agent.traits ?? STARTING_DEFAULTS;
  const [eyesFamily, setEyesFamily] = useState<EyeFamily>(starting.eyesFamily);
  const [mouthFamily, setMouthFamily] = useState<MouthFamily>(starting.mouthFamily);
  const [color, setColor] = useState<string>(agent.color);
  const [tab, setTab] = useState<TabId>('eyes');
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
      <section className="bg-paper text-ink border-[3px] border-ink rounded-none sm:rounded-2xl shadow-brutal w-full sm:max-w-5xl max-h-screen sm:max-h-[95vh] flex flex-col">
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

        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* LEFT — tabs + active tab's picker grid */}
          <div className="flex flex-col min-h-0 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-ink">
            <div
              role="tablist"
              aria-label="Customization categories"
              className="flex gap-1 overflow-x-auto px-3 sm:px-4 pt-3 pb-0 shrink-0"
            >
              {TAB_IDS.map((id) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`tabpanel-${id}`}
                    id={`tab-${id}`}
                    onClick={() => setTab(id)}
                    className={`font-display text-[10px] sm:text-xs tracking-widest border-2 border-ink rounded-t-lg px-3 py-2 shrink-0 transition ${
                      active
                        ? 'bg-accent-pink border-b-paper -mb-[2px] z-10'
                        : 'bg-paper opacity-70 hover:opacity-100'
                    }`}
                  >
                    {TAB_LABELS[id].toUpperCase()}
                  </button>
                );
              })}
              <div className="flex-1 border-b-2 border-ink" aria-hidden />
            </div>

            <div
              role="tabpanel"
              id={`tabpanel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4"
            >
              {tab === 'eyes' && (
                <FamilyGrid
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
              )}
              {tab === 'mouth' && (
                <FamilyGrid
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
              )}
              {tab === 'color' && <ColorTab color={color} onChange={setColor} />}
            </div>
          </div>

          {/* RIGHT — all-12 mood preview, always visible */}
          <div className="flex flex-col min-h-0">
            <div className="px-3 sm:px-4 pt-3 pb-1 shrink-0">
              <h3 className="font-display text-[10px] sm:text-xs tracking-widest opacity-80">
                ▸ ALL 12 MOODS
              </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
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
          {error && (
            <p className="text-red-700 text-xs flex-1 min-w-0 truncate">{error}</p>
          )}
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

interface FamilyGridProps<F extends string> {
  families: readonly F[];
  labels: Record<F, string>;
  value: F;
  onChange: (family: F) => void;
  renderTile: (family: F) => React.ReactNode;
}

// Grid of family tiles. Scales to N families by adding rows. Each tile is a
// live mini-Face so the owner sees the family applied to their current color
// and other-axis selection.
function FamilyGrid<F extends string>({
  families,
  labels,
  value,
  onChange,
  renderTile,
}: FamilyGridProps<F>) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {families.map((family) => {
        const active = family === value;
        return (
          <button
            key={family}
            type="button"
            onClick={() => onChange(family)}
            aria-pressed={active}
            className={`border-[2.5px] border-ink rounded-lg p-2 bg-paper shadow-brutal-sm transition ${
              active
                ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper -translate-x-[1px] -translate-y-[1px]'
                : 'opacity-80 hover:opacity-100 hover:-translate-x-[1px] hover:-translate-y-[1px]'
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
  );
}

interface ColorTabProps {
  color: string;
  onChange: (value: string) => void;
}

// Color tab content. Keeps the same picker UX as before but lives in its own
// tab so EYES/MOUTH stay focused on family selection.
function ColorTab({ color, onChange }: ColorTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] opacity-70 leading-snug">
        Pick a personality color. The face linework auto-flips between
        ink-on-light and cream-on-dark so every color stays readable.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="cursor-pointer">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-14 h-14 border-[2.5px] border-ink rounded-lg cursor-pointer"
            aria-label="Pick personality color"
          />
        </label>
        <input
          type="text"
          value={color}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
              onChange(v.startsWith('#') ? v : `#${v}`);
            }
          }}
          className="font-mono text-sm border-[2.5px] border-ink rounded-lg px-3 py-2 w-32 bg-white"
          placeholder="#5599DD"
          aria-label="Color hex"
        />
      </div>
    </div>
  );
}
