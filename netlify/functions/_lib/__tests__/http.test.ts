import { describe, expect, it } from 'vitest';
import { parseBearer, tokensMatch } from '../http';

describe('parseBearer', () => {
  const make = (header: string | null) =>
    new Request('http://x', header ? { headers: { authorization: header } } : undefined);

  it('extracts a bearer token', () => {
    expect(parseBearer(make('Bearer abc.def'))).toBe('abc.def');
  });

  it('is case-insensitive on the scheme', () => {
    expect(parseBearer(make('bearer XYZ'))).toBe('XYZ');
  });

  it('returns null when header is missing', () => {
    expect(parseBearer(make(null))).toBeNull();
  });

  it('returns null for non-bearer schemes', () => {
    expect(parseBearer(make('Basic dXNlcjpwYXNz'))).toBeNull();
  });
});

describe('tokensMatch', () => {
  it('matches identical strings', () => {
    expect(tokensMatch('hello', 'hello')).toBe(true);
  });

  it('rejects mismatched strings', () => {
    expect(tokensMatch('hello', 'world')).toBe(false);
  });

  it('rejects strings of different length', () => {
    expect(tokensMatch('a', 'ab')).toBe(false);
  });
});
