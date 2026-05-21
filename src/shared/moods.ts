export const MOOD_KEYS = [
  'idle',
  'happy',
  'excited',
  'silly',
  'singing',
  'surprised',
  'thinking',
  'confused',
  'sleepy',
  'sad',
  'angry',
  'error',
] as const;

export type MoodKey = (typeof MOOD_KEYS)[number];

export interface MoodDef {
  label: string;
  eyes: EyeStyle;
  mouth: MouthStyle;
  brows: BrowStyle;
}

export type EyeStyle =
  | 'normal'
  | 'happy'
  | 'sad'
  | 'wide'
  | 'closed'
  | 'lookUp'
  | 'narrow'
  | 'sparkle'
  | 'asymm'
  | 'cross'
  | 'x';

export type MouthStyle =
  | 'gentleSmile'
  | 'bigSmile'
  | 'frown'
  | 'openO'
  | 'tinyO'
  | 'flat'
  | 'smirk'
  | 'singO'
  | 'wavy'
  | 'tongueOut'
  | 'talk_a'
  | 'talk_e'
  | 'talk_o'
  | 'talk_m'
  | 'talk_i'
  | 'talk_u';

export type BrowStyle = 'none' | 'sad' | 'high' | 'angry' | 'quirked' | 'asymm';

export const MOODS: Record<MoodKey, MoodDef> = {
  idle: { label: 'Idle', eyes: 'normal', mouth: 'gentleSmile', brows: 'none' },
  happy: { label: 'Happy', eyes: 'happy', mouth: 'bigSmile', brows: 'none' },
  excited: { label: 'Excited', eyes: 'sparkle', mouth: 'bigSmile', brows: 'high' },
  silly: { label: 'Silly', eyes: 'cross', mouth: 'tongueOut', brows: 'none' },
  singing: { label: 'Singing', eyes: 'happy', mouth: 'singO', brows: 'none' },
  surprised: { label: 'Surprised', eyes: 'wide', mouth: 'openO', brows: 'high' },
  thinking: { label: 'Thinking', eyes: 'lookUp', mouth: 'smirk', brows: 'quirked' },
  confused: { label: 'Confused', eyes: 'asymm', mouth: 'wavy', brows: 'asymm' },
  sleepy: { label: 'Sleepy', eyes: 'closed', mouth: 'tinyO', brows: 'none' },
  sad: { label: 'Sad', eyes: 'sad', mouth: 'frown', brows: 'sad' },
  angry: { label: 'Mad', eyes: 'narrow', mouth: 'flat', brows: 'angry' },
  error: { label: 'Error', eyes: 'x', mouth: 'flat', brows: 'angry' },
};

export const TALK_MOUTHS = ['talk_a', 'talk_e', 'talk_o', 'talk_m', 'talk_i', 'talk_u'] as const;

// ---------------------------------------------------------------------------
// Mug Builder — base traits + per-mood deltas
//
// Owners pick persistent character traits (base eyes, base mouth, color) once.
// Each mood declares a delta — the specific eyes/mouth it MUST show to read as
// that emotion. The renderer composes:
//   eyes  = delta.eyes  ?? traits?.baseEyes  ?? MOODS[mood].eyes
//   mouth = delta.mouth ?? traits?.baseMouth ?? MOODS[mood].mouth
//
// With no traits set, the result equals the original MOODS table (parity).
// Brows stay mood-driven and are not part of the builder in v1.
// ---------------------------------------------------------------------------

// The curated subset of MouthStyle that owners may pick as a base mouth.
// Excludes the talk_* lipsync poses and the two over-expressive entries
// (tongueOut, singO) that are reserved for mood deltas.
export const BASE_MOUTHS = [
  'gentleSmile',
  'bigSmile',
  'frown',
  'openO',
  'tinyO',
  'flat',
  'smirk',
  'wavy',
] as const;

export type BaseMouthStyle = (typeof BASE_MOUTHS)[number];

export interface MoodDelta {
  eyes?: EyeStyle;
  mouth?: MouthStyle;
}

// Derived directly from the existing MOODS table. Only `idle` has no override,
// so an owner's base eyes/mouth flow through unchanged in idle and every other
// mood imposes its emotion. Keep this in lockstep with MOODS to preserve parity.
export const MOOD_DELTAS: Record<MoodKey, MoodDelta> = {
  idle: {},
  happy: { eyes: 'happy', mouth: 'bigSmile' },
  excited: { eyes: 'sparkle', mouth: 'bigSmile' },
  silly: { eyes: 'cross', mouth: 'tongueOut' },
  singing: { eyes: 'happy', mouth: 'singO' },
  surprised: { eyes: 'wide', mouth: 'openO' },
  thinking: { eyes: 'lookUp', mouth: 'smirk' },
  confused: { eyes: 'asymm', mouth: 'wavy' },
  sleepy: { eyes: 'closed', mouth: 'tinyO' },
  sad: { eyes: 'sad', mouth: 'frown' },
  angry: { eyes: 'narrow', mouth: 'flat' },
  error: { eyes: 'x', mouth: 'flat' },
};

// The 11 eye styles, exposed for builder pickers + validation.
export const EYE_STYLES = [
  'normal',
  'happy',
  'sad',
  'wide',
  'closed',
  'lookUp',
  'narrow',
  'sparkle',
  'asymm',
  'cross',
  'x',
] as const satisfies readonly EyeStyle[];

// Persistent visual identity an owner can set on an agent. v = schema version.
export interface AgentTraits {
  v: 1;
  baseEyes: EyeStyle;
  baseMouth: BaseMouthStyle;
}

// Zod schema lives here so the function handler, client validators, and tests
// all share the same source of truth. Imported from 'zod' at the call sites.
import { z } from 'zod';

export const AgentTraitsSchema = z.object({
  v: z.literal(1),
  baseEyes: z.enum(EYE_STYLES),
  baseMouth: z.enum(BASE_MOUTHS),
});

// Pure composition helper. Used by the renderer and by tests.
export function resolveFaceParts(
  mood: MoodKey,
  traits: AgentTraits | null | undefined,
): { eyes: EyeStyle; mouth: MouthStyle; brows: BrowStyle } {
  const moodDef = MOODS[mood];
  const delta = MOOD_DELTAS[mood];
  return {
    eyes: delta.eyes ?? traits?.baseEyes ?? moodDef.eyes,
    mouth: delta.mouth ?? traits?.baseMouth ?? moodDef.mouth,
    brows: moodDef.brows,
  };
}
