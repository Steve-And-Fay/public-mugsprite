import type { MouthFamily, MouthStyle } from '@shared/moods';

// ---------------------------------------------------------------------------
// Mouth families
//
// Each family implements every MouthStyle as an SVG `d` path string. The
// renderer picks the family from the agent's traits and the expression from
// the mood.
// ---------------------------------------------------------------------------

// The "Curve" family — the original Mugsprite mouth. Smooth Bezier curves,
// continuous arcs. This is the built-in family.
const curveMouthPaths: Record<MouthStyle, string> = {
  gentleSmile: 'M 350 700 Q 500 800 650 700',
  bigSmile: 'M 250 690 Q 500 600 750 690 Q 500 950 250 690 Z',
  frown: 'M 350 800 Q 500 680 650 800',
  openO: 'M 500 720 m -80 0 a 80 100 0 1 0 160 0 a 80 100 0 1 0 -160 0',
  tinyO: 'M 500 720 m -25 0 a 25 30 0 1 0 50 0 a 25 30 0 1 0 -50 0',
  flat: 'M 350 740 L 650 740',
  smirk: 'M 380 730 Q 460 750 540 720 Q 580 700 610 735',
  singO: 'M 500 700 Q 600 650 600 720 Q 600 850 500 850 Q 400 850 400 720 Q 400 650 500 700 Z',
  wavy: 'M 320 730 Q 380 700 440 730 T 560 730 T 680 730',
  tongueOut: 'M 280 680 Q 500 620 720 680 Q 500 880 280 680 Z',
  talk_a: 'M 320 680 Q 500 620 680 680 Q 500 880 320 680 Z',
  talk_e: 'M 300 720 Q 500 670 700 720 Q 500 800 300 720 Z',
  talk_o: 'M 500 720 m -50 0 a 50 65 0 1 0 100 0 a 50 65 0 1 0 -100 0',
  talk_m: 'M 380 730 Q 500 745 620 730 Q 620 745 500 752 Q 380 745 380 730 Z',
  talk_i: 'M 320 725 Q 500 745 680 725 Q 680 745 500 760 Q 320 745 320 725 Z',
  talk_u: 'M 500 730 m -35 0 a 35 45 0 1 0 70 0 a 35 45 0 1 0 -70 0',
};

// The "Pixel" family — 8-bit blocky mouths built from straight horizontal and
// vertical segments. Composed of rect-like rectangles using `L` and `Z`. Each
// expression is intentionally constructed as a stairstep / blocky silhouette
// to read as pixel art.
//
// Layout note: paths sit roughly at y=700–820 to match the curve family's
// vertical position so the surrounding face composition stays consistent.
const pixelMouthPaths: Record<MouthStyle, string> = {
  // 6-cell wide, 2-cell tall horizontal smile (bottom row, slight up-bow ends).
  gentleSmile:
    'M 370 720 L 630 720 L 630 740 L 370 740 Z M 350 700 L 370 700 L 370 720 L 350 720 Z M 630 700 L 650 700 L 650 720 L 630 720 Z',
  // Big rectangular grin: 8 wide, 4 tall, with a stairstep along the top so
  // it reads as a "smile" rather than a slab.
  bigSmile:
    'M 280 680 L 720 680 L 720 700 L 740 700 L 740 720 L 760 720 L 760 800 L 240 800 L 240 720 L 260 720 L 260 700 L 280 700 Z',
  // Inverted gentle smile.
  frown:
    'M 350 740 L 370 740 L 370 720 L 630 720 L 630 740 L 650 740 L 650 760 L 350 760 Z',
  // Hollow square mouth (6x8 cells, 1-cell border) reading as "open".
  openO:
    'M 420 660 L 580 660 L 580 800 L 420 800 Z M 440 680 L 560 680 L 560 780 L 440 780 Z',
  // Tiny 2x2 square.
  tinyO: 'M 485 705 L 515 705 L 515 735 L 485 735 Z',
  // Single-pixel horizontal bar.
  flat: 'M 320 730 L 680 730 L 680 750 L 320 750 Z',
  // Stairstep smirk: low-to-high diagonal in 3 steps.
  smirk:
    'M 380 740 L 460 740 L 460 720 L 540 720 L 540 700 L 620 700 L 620 720 L 540 720 L 540 740 L 460 740 L 460 760 L 380 760 Z',
  // Tall rectangle for the sustained sing note.
  singO: 'M 460 660 L 540 660 L 540 820 L 460 820 Z',
  // Zigzag wave of 4 stairsteps.
  wavy:
    'M 320 720 L 400 720 L 400 740 L 480 740 L 480 720 L 560 720 L 560 740 L 640 740 L 640 760 L 320 760 Z',
  // Open square + pink tongue rect dangling.
  tongueOut:
    'M 360 680 L 640 680 L 640 800 L 360 800 Z M 380 700 L 620 700 L 620 780 L 380 780 Z',
  // Lipsync poses — pixel-style mouth shapes, kept blocky for cadence reads
  // even during speech.
  talk_a: 'M 360 680 L 640 680 L 640 800 L 360 800 Z',
  talk_e: 'M 340 710 L 660 710 L 660 770 L 340 770 Z',
  talk_o: 'M 440 690 L 560 690 L 560 790 L 440 790 Z',
  talk_m: 'M 380 730 L 620 730 L 620 750 L 380 750 Z',
  talk_i: 'M 340 720 L 660 720 L 660 740 L 340 740 Z',
  talk_u: 'M 460 710 L 540 710 L 540 770 L 460 770 Z',
};

// The "Toon" family — exaggerated cartoon-monster mouths. Wider openings,
// more pronounced curves, deeper frowns. Pairs naturally with the ToonEye
// family (heavy black outlines, large pupils) for a cohesive bold-cartoon
// character.
const toonMouthPaths: Record<MouthStyle, string> = {
  // Cute closed smile arc — gentle upward curve, single thick stroke.
  // The renderer fills this and the result reads as a friendly "u" smile.
  gentleSmile: 'M 320 700 Q 500 800 680 700',
  // Massive toothy grin, wider on the X and deeper on the Y.
  bigSmile: 'M 200 680 Q 500 570 800 680 Q 500 980 200 680 Z',
  // Dramatic curving frown with thick lower edge implied by the deeper dip.
  frown: 'M 310 820 Q 500 660 690 820',
  // Big shocked O.
  openO: 'M 500 730 m -100 0 a 100 120 0 1 0 200 0 a 100 120 0 1 0 -200 0',
  // Same tiny O — too small to exaggerate.
  tinyO: 'M 500 720 m -28 0 a 28 32 0 1 0 56 0 a 28 32 0 1 0 -56 0',
  // Thicker flat — implied lip-pressed-together via wider Y span.
  flat: 'M 320 730 Q 500 745 680 730 Q 680 760 500 770 Q 320 760 320 730 Z',
  // Smirk — closed asymmetric grin with a little body. Reads as "thinking".
  smirk: 'M 360 720 Q 460 770 540 730 Q 600 700 640 740 Q 540 760 460 750 Q 380 740 360 720 Z',
  // Tall sustained sing-pose, wider than curve family.
  singO: 'M 500 690 Q 620 640 620 720 Q 620 870 500 870 Q 380 870 380 720 Q 380 640 500 690 Z',
  // Bigger flatter wavy — closed thin ribbon. Reads as "confused".
  wavy: 'M 280 720 Q 360 690 440 720 T 600 720 T 720 720 Q 720 745 600 745 T 440 745 T 280 745 Z',
  // Tongue-out monster grin.
  tongueOut: 'M 240 670 Q 500 600 760 670 Q 500 920 240 670 Z',
  // Talk poses — exaggerated openings for stronger cadence reads.
  talk_a: 'M 280 670 Q 500 600 720 670 Q 500 910 280 670 Z',
  talk_e: 'M 270 720 Q 500 660 730 720 Q 500 820 270 720 Z',
  talk_o: 'M 500 720 m -60 0 a 60 75 0 1 0 120 0 a 60 75 0 1 0 -120 0',
  talk_m: 'M 360 730 Q 500 750 640 730 Q 640 750 500 760 Q 360 750 360 730 Z',
  talk_i: 'M 300 725 Q 500 750 700 725 Q 700 750 500 765 Q 300 750 300 725 Z',
  talk_u: 'M 500 730 m -42 0 a 42 52 0 1 0 84 0 a 42 52 0 1 0 -84 0',
};

// Public dispatcher. Falls back to "curve" for unknown families (defensive
// against forward-compatible JSONB rows from a future family).
export function mouthPathFor(family: MouthFamily, expression: MouthStyle): string {
  const table =
    family === 'pixel' ? pixelMouthPaths : family === 'toon' ? toonMouthPaths : curveMouthPaths;
  return table[expression];
}

// Tongue path. Curve/Pixel families only render a tongue for "tongueOut".
// The Toon family shows a soft pink lower lip / tongue across every wide-open
// expression so the monster-mouth interior reads correctly.
export function tonguePath(family: MouthFamily, expression: MouthStyle): string {
  if (family === 'toon') {
    switch (expression) {
      case 'tongueOut':
        return 'M 440 770 Q 430 880 510 890 Q 590 880 560 770 Z';
      case 'bigSmile':
        return 'M 290 850 Q 500 950 710 850 Q 500 920 290 850 Z';
      case 'talk_a':
        return 'M 320 830 Q 500 920 680 830 Q 500 900 320 830 Z';
      case 'frown':
        return 'M 360 800 Q 500 760 640 800 Q 500 830 360 800 Z';
      case 'openO':
        return 'M 440 800 Q 500 850 560 800 Q 500 830 440 800 Z';
      case 'singO':
        return 'M 460 820 Q 500 860 540 820 Q 500 850 460 820 Z';
      default:
        return '';
    }
  }
  return expression === 'tongueOut'
    ? 'M 470 770 Q 460 870 510 880 Q 560 870 540 770 Z'
    : '';
}

// Legacy export retained for any test or import that still references the
// curve-family map directly. New callers should use mouthPathFor.
export const mouthPaths = curveMouthPaths;
