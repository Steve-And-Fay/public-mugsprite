import { describe, expect, it } from 'vitest';
import { AgentNameSchema, HexColorSchema, MoodSchema, RoomIdSchema } from '../types';

describe('schema validation', () => {
  it('accepts valid moods', () => {
    expect(MoodSchema.parse('idle')).toBe('idle');
    expect(MoodSchema.parse('thinking')).toBe('thinking');
  });

  it('rejects unknown moods', () => {
    expect(() => MoodSchema.parse('bewildered')).toThrow();
  });

  it('accepts 6-digit hex colors', () => {
    expect(HexColorSchema.parse('#5599DD')).toBe('#5599DD');
  });

  it('rejects malformed colors', () => {
    expect(() => HexColorSchema.parse('5599DD')).toThrow();
    expect(() => HexColorSchema.parse('#55')).toThrow();
    expect(() => HexColorSchema.parse('red')).toThrow();
  });

  it('accepts well-formed agent names', () => {
    expect(AgentNameSchema.parse('SCOUT')).toBe('SCOUT');
    expect(AgentNameSchema.parse('agent_01')).toBe('agent_01');
  });

  it('rejects empty or oversized names', () => {
    expect(() => AgentNameSchema.parse('')).toThrow();
    expect(() => AgentNameSchema.parse('x'.repeat(33))).toThrow();
    expect(() => AgentNameSchema.parse('<script>')).toThrow();
  });

  it('accepts valid room slugs', () => {
    expect(RoomIdSchema.parse('abc123')).toBe('abc123');
  });

  it('rejects uppercase or short slugs', () => {
    expect(() => RoomIdSchema.parse('ABC')).toThrow();
    expect(() => RoomIdSchema.parse('ab')).toThrow();
  });
});
