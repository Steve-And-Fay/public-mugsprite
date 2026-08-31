// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url));

describe('existing Mugsprite favicon artwork', () => {
  it('keeps the trusted source SVG unchanged', () => {
    expect(createHash('sha256').update(read('public/favicon.svg')).digest('hex')).toBe(
      '89bcf91abeb22d61fba712bab644e804a465f2198459b2c289c2bca3d2c67eb0',
    );
  });

  it('provides a compact 128 pixel PNG for raster-only readers', () => {
    const bytes = read('public/favicon.png');
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.readUInt32BE(16)).toBe(128);
    expect(bytes.readUInt32BE(20)).toBe(128);
    expect(bytes.length).toBeLessThan(20_000);
  });

  it('declares both icons in the page and manifest without replacing the SVG', () => {
    const html = read('index.html').toString();
    expect(html).toContain(
      '<link rel="icon" type="image/png" sizes="128x128" href="/favicon.png" />',
    );
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
    const manifest = JSON.parse(read('public/manifest.webmanifest').toString());
    expect(manifest.icons).toEqual([
      { src: '/favicon.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ]);
  });
});
