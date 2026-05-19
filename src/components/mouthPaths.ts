import type { MouthStyle } from '@shared/moods';

export const mouthPaths: Record<MouthStyle, string> = {
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

export const tonguePath = (mouth: MouthStyle): string =>
  mouth === 'tongueOut' ? 'M 470 770 Q 460 870 510 880 Q 560 870 540 770 Z' : '';
