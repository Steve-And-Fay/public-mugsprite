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
