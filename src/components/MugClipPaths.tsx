// Global SVG clipPath definitions for non-rectangular body shapes. Rendered
// once at the app root so every Face tile (in the grid AND in the builder
// preview) can reference the same IDs via clip-path: url(#mug-...).
//
// clipPathUnits="objectBoundingBox" lets the same definition scale to any
// tile size — coords are 0..1 fractions of the element being clipped.

export function MugClipPaths() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* Heart: two rounded humps with a center dip, sweeping down to a
            point at the bottom. Built from cubic Béziers so the curves
            are smooth at any size. */}
        <clipPath id="mug-heart" clipPathUnits="objectBoundingBox">
          <path
            d="
              M 0.5,0.95
              C 0.5,0.85 0.05,0.6 0.05,0.3
              C 0.05,0.1 0.25,0.02 0.5,0.22
              C 0.75,0.02 0.95,0.1 0.95,0.3
              C 0.95,0.6 0.5,0.85 0.5,0.95
              Z
            "
          />
        </clipPath>

        {/* Blob: asymmetric organic shape built from cubic Béziers. Slight
            tilt and uneven bulges to feel hand-drawn rather than
            geometric. */}
        <clipPath id="mug-blob" clipPathUnits="objectBoundingBox">
          <path
            d="
              M 0.55,0.04
              C 0.78,0.06 0.96,0.22 0.94,0.45
              C 0.99,0.68 0.82,0.92 0.55,0.94
              C 0.32,0.99 0.06,0.84 0.06,0.58
              C 0.02,0.32 0.20,0.10 0.45,0.06
              C 0.49,0.05 0.52,0.04 0.55,0.04
              Z
            "
          />
        </clipPath>
      </defs>
    </svg>
  );
}
