import { describe, expect, it } from 'vitest';
import { generateAgentName, generateRoomId, generateToken, generateUuid } from '../ids';

describe('generateRoomId', () => {
  it('produces adjective-animal-NN slugs', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateRoomId();
      expect(id).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    }
  });

  it('produces mostly-unique ids over many invocations', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(generateRoomId());
    // ~44M combination space; 1000 draws should give ≥990 unique.
    expect(ids.size).toBeGreaterThanOrEqual(990);
  });
});

describe('generateAgentName', () => {
  it('produces mood-creature-NN slugs', () => {
    for (let i = 0; i < 50; i++) {
      const name = generateAgentName();
      expect(name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
    }
  });
});

describe('generateToken', () => {
  it('produces url-safe base64 strings of expected length', () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('produces unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i++) tokens.add(generateToken());
    expect(tokens.size).toBe(1000);
  });
});

describe('generateUuid', () => {
  it('produces RFC4122 v4 uuids', () => {
    expect(generateUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
