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
export const BROW_FAMILIES = ['default', 'bold'] as const;
export const BODY_SHAPES = ['square', 'circle'] as const;
export const GLASSES_FAMILIES = ['none', 'sunglasses', 'round', 'square'] as const;

export type EyeFamily = (typeof EYE_FAMILIES)[number];
export type MouthFamily = (typeof MOUTH_FAMILIES)[number];
export type BrowFamily = (typeof BROW_FAMILIES)[number];
export type BodyShape = (typeof BODY_SHAPES)[number];
export type GlassesFamily = (typeof GLASSES_FAMILIES)[number];

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
export const BROW_FAMILY_LABELS: Record<BrowFamily, string> = {
  default: 'Classic',
  bold: 'Bold',
};
export const BODY_SHAPE_LABELS: Record<BodyShape, string> = {
  square: 'Square',
  circle: 'Circle',
};
export const GLASSES_FAMILY_LABELS: Record<GlassesFamily, string> = {
  none: 'None',
  sunglasses: 'Sunnies',
  round: 'Round',
  square: 'Square',
};

export const DEFAULT_EYES_FAMILY: EyeFamily = 'round';
export const DEFAULT_MOUTH_FAMILY: MouthFamily = 'curve';
export const DEFAULT_BROWS_FAMILY: BrowFamily = 'default';
export const DEFAULT_BODY_SHAPE: BodyShape = 'square';
export const DEFAULT_GLASSES_FAMILY: GlassesFamily = 'none';

// Persistent visual identity an owner can set on an agent. v = schema version.
// v=2 is the family-based schema. Brows and cheeks were added later as
// optional fields; agents stored before those existed still validate and the
// renderer fills them with safe defaults.
export interface AgentTraits {
  v: 2;
  eyesFamily: EyeFamily;
  mouthFamily: MouthFamily;
  browsFamily?: BrowFamily;
  bodyShape?: BodyShape;
  glassesFamily?: GlassesFamily;
}

export const AgentTraitsSchema = z.object({
  v: z.literal(2),
  eyesFamily: z.enum(EYE_FAMILIES),
  mouthFamily: z.enum(MOUTH_FAMILIES),
  browsFamily: z.enum(BROW_FAMILIES).optional(),
  bodyShape: z.enum(BODY_SHAPES).optional(),
  glassesFamily: z.enum(GLASSES_FAMILIES).optional(),
});

// Pure composition helper. Picks every family from traits (falling back to
// defaults) and expression from the mood. Brows still have a per-mood
// expression on top of the chosen family.
export function resolveFaceParts(
  mood: MoodKey,
  traits: AgentTraits | null | undefined,
): {
  eyesFamily: EyeFamily;
  eyesExpression: EyeStyle;
  mouthFamily: MouthFamily;
  mouthExpression: MouthStyle;
  browsFamily: BrowFamily;
  browsExpression: BrowStyle;
  bodyShape: BodyShape;
  glassesFamily: GlassesFamily;
} {
  const moodDef = MOODS[mood];
  return {
    eyesFamily: traits?.eyesFamily ?? DEFAULT_EYES_FAMILY,
    eyesExpression: moodDef.eyes,
    mouthFamily: traits?.mouthFamily ?? DEFAULT_MOUTH_FAMILY,
    mouthExpression: moodDef.mouth,
    browsFamily: traits?.browsFamily ?? DEFAULT_BROWS_FAMILY,
    browsExpression: moodDef.brows,
    bodyShape: traits?.bodyShape ?? DEFAULT_BODY_SHAPE,
    glassesFamily: traits?.glassesFamily ?? DEFAULT_GLASSES_FAMILY,
  };
}
