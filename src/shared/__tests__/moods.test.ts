import { describe, expect, it } from 'vitest';
import {
  AgentTraitsSchema,
  BASE_MOUTHS,
  EYE_STYLES,
  MOODS,
  MOOD_KEYS,
  MOOD_DELTAS,
  resolveFaceParts,
} from '../moods';

// The mug-builder refactor must be visually inert when no traits are set.
// resolveFaceParts(mood, null) must yield the exact triple every mood has
// shipped with up to this point, for every mood.
describe('resolveFaceParts — parity with original MOODS table', () => {
  for (const mood of MOOD_KEYS) {
    it(`mood "${mood}" with traits=null matches MOODS[${mood}]`, () => {
      const expected = MOODS[mood];
      const actual = resolveFaceParts(mood, null);
      expect(actual).toEqual({
        eyes: expected.eyes,
        mouth: expected.mouth,
        brows: expected.brows,
      });
    });
  }

  it('mood deltas are exhaustive — every key in MOODS has a delta entry', () => {
    for (const mood of MOOD_KEYS) {
      expect(MOOD_DELTAS).toHaveProperty(mood);
    }
  });
});

describe('resolveFaceParts — owner traits override the idle defaults only', () => {
  it('idle uses the owner base for both eyes and mouth', () => {
    const result = resolveFaceParts('idle', {
      v: 1,
      baseEyes: 'sparkle',
      baseMouth: 'wavy',
    });
    expect(result.eyes).toBe('sparkle');
    expect(result.mouth).toBe('wavy');
  });

  it('expressive moods still impose their delta over owner traits', () => {
    // The owner wants button-style mouths and asymm eyes — but `sleepy` must
    // still show closed eyes and a tinyO mouth, otherwise sleepiness doesn't
    // read. The character base only shows through where the mood doesn't
    // declare an override (i.e. idle).
    const traits = { v: 1, baseEyes: 'wide', baseMouth: 'smirk' } as const;
    expect(resolveFaceParts('sleepy', traits)).toEqual({
      eyes: 'closed',
      mouth: 'tinyO',
      brows: 'none',
    });
    expect(resolveFaceParts('sad', traits)).toEqual({
      eyes: 'sad',
      mouth: 'frown',
      brows: 'sad',
    });
  });
});

describe('AgentTraitsSchema', () => {
  it('accepts every (baseEyes, baseMouth) pair across the curated sets', () => {
    for (const eyes of EYE_STYLES) {
      for (const mouth of BASE_MOUTHS) {
        const parsed = AgentTraitsSchema.safeParse({
          v: 1,
          baseEyes: eyes,
          baseMouth: mouth,
        });
        expect(parsed.success).toBe(true);
      }
    }
  });

  it('rejects unknown mouth styles (e.g. talk_a) — only BASE_MOUTHS are valid', () => {
    const parsed = AgentTraitsSchema.safeParse({
      v: 1,
      baseEyes: 'normal',
      baseMouth: 'talk_a',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects future schema versions until they are migrated', () => {
    const parsed = AgentTraitsSchema.safeParse({
      v: 2,
      baseEyes: 'normal',
      baseMouth: 'gentleSmile',
    });
    expect(parsed.success).toBe(false);
  });
});
