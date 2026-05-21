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

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Mug Builder — eye and mouth families
//
// Owners pick a family for eyes and a family for mouth. A family is a coherent
// visual character (e.g. "Round", "Pixel") that knows how to draw every mood
// expression. The renderer picks the family from traits and the expression
// from the mood.
//
// EyeStyle / MouthStyle keys are reused as expression keys — every family
// must be able to draw every key. The MOODS table maps mood → expression key,
// and each family's renderer maps expression key → SVG.
//
// With no traits set, the renderer falls back to the "round" family for eyes
// and the "curve" family for mouth — those wrap the built-in art.
// Brows stay mood-driven and are not part of the builder in v1.
// ---------------------------------------------------------------------------

export const EYE_FAMILIES = ['round', 'pixel', 'toon'] as const;
export const MOUTH_FAMILIES = ['curve', 'pixel', 'toon'] as const;

export type EyeFamily = (typeof EYE_FAMILIES)[number];
export type MouthFamily = (typeof MOUTH_FAMILIES)[number];

export const EYE_FAMILY_LABELS: Record<EyeFamily, string> = {
  round: 'Round',
  pixel: 'Pixel',
  toon: 'Toon',
};
export const MOUTH_FAMILY_LABELS: Record<MouthFamily, string> = {
  curve: 'Curve',
  pixel: 'Pixel',
  toon: 'Toon',
};

export const DEFAULT_EYES_FAMILY: EyeFamily = 'round';
export const DEFAULT_MOUTH_FAMILY: MouthFamily = 'curve';

// Persistent visual identity an owner can set on an agent. v = schema version.
// v=2 is the family-based schema; v=1 (legacy single-style) is no longer
// accepted server-side — old rows still validate to null and fall back to
// the built-in default.
export interface AgentTraits {
  v: 2;
  eyesFamily: EyeFamily;
  mouthFamily: MouthFamily;
}

export const AgentTraitsSchema = z.object({
  v: z.literal(2),
  eyesFamily: z.enum(EYE_FAMILIES),
  mouthFamily: z.enum(MOUTH_FAMILIES),
});

// Pure composition helper. Picks family from traits (falling back to defaults)
// and expression from the mood. Brows remain mood-driven.
export function resolveFaceParts(
  mood: MoodKey,
  traits: AgentTraits | null | undefined,
): {
  eyesFamily: EyeFamily;
  eyesExpression: EyeStyle;
  mouthFamily: MouthFamily;
  mouthExpression: MouthStyle;
  brows: BrowStyle;
} {
  const moodDef = MOODS[mood];
  return {
    eyesFamily: traits?.eyesFamily ?? DEFAULT_EYES_FAMILY,
    eyesExpression: moodDef.eyes,
    mouthFamily: traits?.mouthFamily ?? DEFAULT_MOUTH_FAMILY,
    mouthExpression: moodDef.mouth,
    brows: moodDef.brows,
  };
}
