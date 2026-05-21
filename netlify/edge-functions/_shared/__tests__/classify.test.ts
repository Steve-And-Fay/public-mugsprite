import { describe, expect, it } from 'vitest';
import {
  classifyDevice,
  extractReferrerHost,
  normalizePath,
  resolveCountry,
} from '../classify';

describe('classifyDevice', () => {
  it('flags bots aggressively', () => {
    expect(classifyDevice('Googlebot/2.1')).toBe('bot');
    expect(classifyDevice('curl/8.0.0')).toBe('bot');
    expect(classifyDevice('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe('bot');
    expect(classifyDevice('HeadlessChrome/120')).toBe('bot');
    expect(classifyDevice('facebookexternalhit/1.1')).toBe('bot');
  });

  it('detects mobile UAs', () => {
    expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mobile');
    expect(classifyDevice('Mozilla/5.0 (Linux; Android 14; Pixel 7)')).toBe('mobile');
  });

  it('falls back to desktop for normal browser UAs', () => {
    expect(classifyDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120')).toBe('desktop');
    expect(classifyDevice('Mozilla/5.0 (Windows NT 10.0) Firefox/120')).toBe('desktop');
  });

  it('returns other for empty / unknown', () => {
    expect(classifyDevice('')).toBe('other');
    expect(classifyDevice(null)).toBe('other');
    expect(classifyDevice('Some weird custom client')).toBe('other');
  });
});

describe('normalizePath', () => {
  it('collapses room slugs', () => {
    expect(normalizePath('/r/abc123')).toBe('/r/:roomId');
    expect(normalizePath('/r/some-slug/tv')).toBe('/r/:roomId/tv');
  });

  it('strips query and fragment', () => {
    expect(normalizePath('/faq?utm_source=x')).toBe('/faq');
    expect(normalizePath('/sponsor#anchor')).toBe('/sponsor');
  });

  it('handles root and missing leading slash', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('faq')).toBe('/faq');
  });

  it('trims trailing slash', () => {
    expect(normalizePath('/sponsor/')).toBe('/sponsor');
  });

  it('caps absurdly long paths', () => {
    const long = '/' + 'a'.repeat(500);
    expect(normalizePath(long).length).toBe(200);
  });
});

describe('extractReferrerHost', () => {
  it('returns hostname only', () => {
    expect(extractReferrerHost('https://news.ycombinator.com/item?id=1')).toBe(
      'news.ycombinator.com',
    );
  });

  it('returns null for empty/invalid', () => {
    expect(extractReferrerHost(null)).toBeNull();
    expect(extractReferrerHost('')).toBeNull();
    expect(extractReferrerHost('not a url')).toBeNull();
  });
});

describe('resolveCountry', () => {
  it('reads cf-ipcountry', () => {
    const h = new Headers({ 'cf-ipcountry': 'us' });
    expect(resolveCountry(h)).toBe('US');
  });

  it('reads x-nf-geo JSON', () => {
    const h = new Headers({ 'x-nf-geo': JSON.stringify({ country: { code: 'de' } }) });
    expect(resolveCountry(h)).toBe('DE');
  });

  it('returns null when no headers present or malformed', () => {
    expect(resolveCountry(new Headers())).toBeNull();
    expect(resolveCountry(new Headers({ 'cf-ipcountry': 'XX' }))).toBeNull();
    expect(resolveCountry(new Headers({ 'x-nf-geo': 'not json' }))).toBeNull();
  });
});
