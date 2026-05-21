import { describe, expect, it } from 'vitest';
import {
  AgentTraitsSchema,
  DEFAULT_EYES_FAMILY,
  DEFAULT_MOUTH_FAMILY,
  EYE_FAMILIES,
  MOODS,
  MOOD_KEYS,
  MOUTH_FAMILIES,
  resolveFaceParts,
} from '../moods';

// The family model: every mood selects its EXPRESSION from the MOODS table,
// and traits select the FAMILY (eye style + mouth style as cohesive sets).
// resolveFaceParts is pure and the only composition path the renderer uses.

describe('resolveFaceParts — null traits fall back to built-in families', () => {
  for (const mood of MOOD_KEYS) {
    it(`mood "${mood}" with traits=null uses the default families`, () => {
      const result = resolveFaceParts(mood, null);
      expect(result.eyesFamily).toBe(DEFAULT_EYES_FAMILY);
      expect(result.mouthFamily).toBe(DEFAULT_MOUTH_FAMILY);
      expect(result.eyesExpression).toBe(MOODS[mood].eyes);
      expect(result.mouthExpression).toBe(MOODS[mood].mouth);
      expect(result.browsExpression).toBe(MOODS[mood].brows);
    });
  }
});

describe('resolveFaceParts — family selection carries through every mood', () => {
  it('picking a non-default eye family overrides every mood', () => {
    for (const mood of MOOD_KEYS) {
      const result = resolveFaceParts(mood, {
        v: 2,
        eyesFamily: 'pixel',
        mouthFamily: DEFAULT_MOUTH_FAMILY,
      });
      expect(result.eyesFamily).toBe('pixel');
      // The mood still drives WHICH expression within that family.
      expect(result.eyesExpression).toBe(MOODS[mood].eyes);
    }
  });

  it('picking a non-default mouth family overrides every mood', () => {
    for (const mood of MOOD_KEYS) {
      const result = resolveFaceParts(mood, {
        v: 2,
        eyesFamily: DEFAULT_EYES_FAMILY,
        mouthFamily: 'pixel',
      });
      expect(result.mouthFamily).toBe('pixel');
      expect(result.mouthExpression).toBe(MOODS[mood].mouth);
    }
  });

  it('family fields are independent — eyes and mouth can come from different families', () => {
    const result = resolveFaceParts('happy', {
      v: 2,
      eyesFamily: 'pixel',
      mouthFamily: 'curve',
    });
    expect(result.eyesFamily).toBe('pixel');
    expect(result.mouthFamily).toBe('curve');
  });
});

describe('AgentTraitsSchema', () => {
  it('accepts every (eyesFamily, mouthFamily) pair', () => {
    for (const eyes of EYE_FAMILIES) {
      for (const mouth of MOUTH_FAMILIES) {
        const parsed = AgentTraitsSchema.safeParse({
          v: 2,
          eyesFamily: eyes,
          mouthFamily: mouth,
        });
        expect(parsed.success).toBe(true);
      }
    }
  });

  it('rejects unknown family values', () => {
    expect(
      AgentTraitsSchema.safeParse({
        v: 2,
        eyesFamily: 'not-a-family',
        mouthFamily: 'curve',
      }).success,
    ).toBe(false);
  });

  it('rejects legacy v=1 payloads — they must be migrated or treated as null', () => {
    expect(
      AgentTraitsSchema.safeParse({
        v: 1,
        baseEyes: 'normal',
        baseMouth: 'gentleSmile',
      }).success,
    ).toBe(false);
  });
});
