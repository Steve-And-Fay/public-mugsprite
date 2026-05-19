import { describe, expect, it } from 'vitest';
import { normalizeRoomName, PatchRoomBody, PATCH_ROOM_NAME_MAX } from '../roomName';

describe('normalizeRoomName', () => {
  it('returns null when input is null', () => {
    expect(normalizeRoomName(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeRoomName('')).toBeNull();
  });

  it('returns null for whitespace-only strings', () => {
    expect(normalizeRoomName('   ')).toBeNull();
    expect(normalizeRoomName('\t\n  ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeRoomName('  My Room  ')).toBe('My Room');
  });

  it('preserves internal whitespace and punctuation', () => {
    expect(normalizeRoomName('Steve & Fay — sprint planning')).toBe(
      'Steve & Fay — sprint planning',
    );
  });
});

describe('PatchRoomBody schema', () => {
  it('accepts a normal display name', () => {
    const result = PatchRoomBody.safeParse({ name: 'Sprint Planning' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Sprint Planning');
  });

  it('accepts null to clear the name', () => {
    const result = PatchRoomBody.safeParse({ name: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBeNull();
  });

  it('accepts empty string (UI uses this to clear)', () => {
    const result = PatchRoomBody.safeParse({ name: '' });
    expect(result.success).toBe(true);
  });

  it('rejects names longer than PATCH_ROOM_NAME_MAX', () => {
    const tooLong = 'x'.repeat(PATCH_ROOM_NAME_MAX + 1);
    const result = PatchRoomBody.safeParse({ name: tooLong });
    expect(result.success).toBe(false);
  });

  it('accepts names exactly at the max length', () => {
    const atMax = 'y'.repeat(PATCH_ROOM_NAME_MAX);
    const result = PatchRoomBody.safeParse({ name: atMax });
    expect(result.success).toBe(true);
  });

  it('rejects when name is missing entirely', () => {
    const result = PatchRoomBody.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string name values', () => {
    expect(PatchRoomBody.safeParse({ name: 42 }).success).toBe(false);
    expect(PatchRoomBody.safeParse({ name: ['hi'] }).success).toBe(false);
    expect(PatchRoomBody.safeParse({ name: { value: 'hi' } }).success).toBe(false);
  });
});
