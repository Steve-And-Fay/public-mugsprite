import { createContext, useContext } from 'react';

// Two-token palette so the linework stays legible no matter what color the
// agent picks. `ink` is the strokes/outlines/eyeball fills; `paper` is the
// contrast highlight (pupils, sclera dots, teeth). Inverted as a pair when
// the agent's background is dark, so a black-personality agent doesn't end
// up with invisible black-on-black features.
export interface FaceInk {
  ink: string;
  paper: string;
  // True when the agent's background is dark enough that we flipped the
  // linework. Subtle decorative shadows (like the eye-socket halo) need to
  // raise their opacity in that case, otherwise an 8%-cream wash on black
  // is functionally invisible.
  isDark: boolean;
}

const DEFAULT_INK: FaceInk = { ink: '#0a0a0a', paper: '#ffffff', isDark: false };

export const FaceInkContext = createContext<FaceInk>(DEFAULT_INK);

export function useFaceInk(): FaceInk {
  return useContext(FaceInkContext);
}
