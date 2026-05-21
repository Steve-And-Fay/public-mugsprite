import type {
  BrowStyle,
  EyeFamily,
  EyeStyle,
  MoodKey,
  MouthFamily,
  MouthStyle,
} from '@shared/moods';
import { useFaceInk } from './faceInk';

// React/JSX SVG primitives for every facial feature. Rendering these as real
// React children (rather than parsed string fragments) lets the SMIL <animate>
// elements activate properly under the live SVG document.

interface EyeProps {
  family: EyeFamily;
  expression: EyeStyle;
  cx: number;
  cy: number;
  isLeft: boolean;
}

// Dispatcher: pick the family-specific renderer, hand it the expression.
// Every family MUST implement every EyeStyle key — failing tests catch gaps.
export function Eye({ family, expression, cx, cy, isLeft }: EyeProps) {
  if (family === 'pixel') {
    return <PixelEye style={expression} cx={cx} cy={cy} isLeft={isLeft} />;
  }
  if (family === 'toon') {
    return <ToonEye style={expression} cx={cx} cy={cy} isLeft={isLeft} />;
  }
  return <RoundEye style={expression} cx={cx} cy={cy} isLeft={isLeft} />;
}

interface FamilyEyeProps {
  style: EyeStyle;
  cx: number;
  cy: number;
  isLeft: boolean;
}

// The "Round" family: the original Mugsprite eyes. Smooth Bezier ellipses,
// continuous animations, blinking sclera highlights. This is the built-in
// family — every existing room renders with it.
function RoundEye({ style, cx, cy, isLeft }: FamilyEyeProps) {
  const { ink, paper, isDark } = useFaceInk();
  // Decorative shadows under closed-eye arcs are 8% ink on light faces. On
  // dark faces that's a near-invisible cream wash, so raise the opacity to
  // create a soft glow with comparable visual weight.
  const haloOpacity = isDark ? 0.22 : 0.08;
  switch (style) {
    case 'happy':
      return (
        <>
          {/* Soft eye-socket shadow so the arc has visual weight even when curled up */}
          <ellipse cx={cx} cy={cy + 5} rx={75} ry={45} fill={ink} opacity={haloOpacity} />
          <path
            d={`M ${cx - 80} ${cy + 25} Q ${cx} ${cy - 80} ${cx + 80} ${cy + 25}`}
            stroke={ink}
            strokeWidth={32}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values={`M ${cx - 80} ${cy + 25} Q ${cx} ${cy - 80} ${cx + 80} ${cy + 25};M ${cx - 80} ${cy + 18} Q ${cx} ${cy - 95} ${cx + 80} ${cy + 18};M ${cx - 80} ${cy + 25} Q ${cx} ${cy - 80} ${cx + 80} ${cy + 25}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );

    case 'sad':
      return (
        <>
          <ellipse cx={cx} cy={cy + 5} rx={58} ry={72} fill={ink} />
          <ellipse cx={cx - 12} cy={cy + 28} rx={13} ry={16} fill={paper} />
          <path
            d={`M ${cx + 30} ${cy + 60} Q ${cx + 25} ${cy + 110} ${cx + 50} ${cy + 130}`}
            stroke="#5599DD"
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
          >
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" />
          </path>
        </>
      );

    case 'wide':
      return (
        <>
          <circle cx={cx} cy={cy} r={78} fill={paper} stroke={ink} strokeWidth={7} />
          <circle cx={cx} cy={cy} r={32} fill={ink}>
            <animate attributeName="r" values="32;28;32" dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + 8} cy={cy - 10} r={6} fill={paper} />
        </>
      );

    case 'closed':
      return (
        <>
          <ellipse cx={cx} cy={cy + 10} rx={78} ry={42} fill={ink} opacity={haloOpacity} />
          <path
            d={`M ${cx - 78} ${cy} Q ${cx} ${cy + 45} ${cx + 78} ${cy}`}
            stroke={ink}
            strokeWidth={30}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values={`M ${cx - 78} ${cy} Q ${cx} ${cy + 45} ${cx + 78} ${cy};M ${cx - 78} ${cy} Q ${cx} ${cy + 52} ${cx + 78} ${cy};M ${cx - 78} ${cy} Q ${cx} ${cy + 45} ${cx + 78} ${cy}`}
              dur="3.5s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );

    case 'lookUp':
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill={ink} />
          <ellipse cx={cx + 12} cy={cy - 52} rx={16} ry={20} fill={paper}>
            <animate
              attributeName="cx"
              values={`${cx + 12};${cx - 12};${cx + 12}`}
              dur="3s"
              repeatCount="indefinite"
            />
          </ellipse>
        </>
      );

    case 'narrow':
      return (
        <>
          <ellipse cx={cx} cy={cy + 10} rx={68} ry={28} fill={ink} />
          <ellipse cx={cx + 18} cy={cy + 5} rx={11} ry={13} fill={paper}>
            <animate
              attributeName="cx"
              values={`${cx + 18};${cx - 18};${cx + 18}`}
              dur="1.2s"
              repeatCount="indefinite"
            />
          </ellipse>
        </>
      );

    case 'sparkle': {
      // Big black eye + a clean 4-point sparkle highlight at upper-left,
      // plus a tiny round catchlight. Pulses subtly so it reads as "starry-eyed".
      const sx = cx - 6;
      const sy = cy - 14;
      const r = 18;
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill={ink} />
          <g style={{ transformOrigin: `${sx}px ${sy}px` }}>
            <path
              d={`M ${sx} ${sy - r} L ${sx + r * 0.32} ${sy - r * 0.32} L ${sx + r} ${sy} L ${sx + r * 0.32} ${sy + r * 0.32} L ${sx} ${sy + r} L ${sx - r * 0.32} ${sy + r * 0.32} L ${sx - r} ${sy} L ${sx - r * 0.32} ${sy - r * 0.32} Z`}
              fill={paper}
            >
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1.18;0.92;1"
                dur="1.4s"
                repeatCount="indefinite"
                additive="sum"
              />
            </path>
          </g>
          <circle cx={cx + 18} cy={cy + 20} r={5} fill={paper} opacity={0.85} />
        </>
      );
    }

    case 'asymm': {
      const rx = isLeft ? 68 : 42;
      const ry = isLeft ? 88 : 56;
      const pupilRx = isLeft ? 16 : 11;
      const pupilRy = isLeft ? 20 : 14;
      const pupilDy = isLeft ? 22 : 14;
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={ink}>
            <animate
              attributeName="rx"
              values={`${rx};${rx - 8};${rx}`}
              dur="2.4s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse
            cx={cx + 12}
            cy={cy - pupilDy}
            rx={pupilRx}
            ry={pupilRy}
            fill={paper}
          />
        </>
      );
    }

    case 'cross': {
      const offset = isLeft ? 28 : -28;
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill={ink} />
          <ellipse cx={cx + offset} cy={cy - 8} rx={16} ry={22} fill={paper}>
            <animate
              attributeName="cy"
              values={`${cy - 8};${cy - 22};${cy - 8}`}
              dur="2.5s"
              repeatCount="indefinite"
            />
          </ellipse>
        </>
      );
    }

    case 'x':
      return (
        <>
          <line
            x1={cx - 55}
            y1={cy - 55}
            x2={cx + 55}
            y2={cy + 55}
            stroke={ink}
            strokeWidth={24}
            strokeLinecap="round"
          />
          <line
            x1={cx - 55}
            y1={cy + 55}
            x2={cx + 55}
            y2={cy - 55}
            stroke={ink}
            strokeWidth={24}
            strokeLinecap="round"
          />
        </>
      );

    case 'normal':
    default:
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill={ink} />
          <ellipse cx={cx + 14} cy={cy - 22} rx={16} ry={22} fill={paper}>
            <animate
              attributeName="cx"
              values={`${cx + 14};${cx - 4};${cx + 16};${cx + 14}`}
              dur="6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${cy - 22};${cy - 28};${cy - 18};${cy - 22}`}
              dur="6s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse cx={cx + 8} cy={cy - 26} rx={6} ry={9} fill={paper} opacity={0.8} />
        </>
      );
  }
}

// The "Pixel" family: 8-bit blocky eyes built from rect primitives. Hard pixel
// edges (shape-rendering crispEdges) and no Bezier curves. Animations use
// discrete rect swaps rather than smooth interpolation so the retro feel
// carries through into motion. Every expression in EyeStyle is implemented.
function PixelEye({ style, cx, cy, isLeft }: FamilyEyeProps) {
  const { ink, paper } = useFaceInk();
  // Common grid: each "pixel" is a 16x16 rect. The eye spans roughly a
  // 144x144 region centered on (cx, cy).
  const P = 16;
  const shape = 'crispEdges' as const;

  switch (style) {
    case 'happy':
      // 3-rect arc curving up: an 8-bit grin made of stairsteps.
      return (
        <g shapeRendering={shape}>
          <rect x={cx - 3 * P} y={cy + P} width={2 * P} height={P} fill={ink} />
          <rect x={cx - P} y={cy} width={2 * P} height={P} fill={ink} />
          <rect x={cx + P} y={cy + P} width={2 * P} height={P} fill={ink} />
        </g>
      );
    case 'sad':
      // Drooping arc (inverse of happy) plus a tear pixel.
      return (
        <g shapeRendering={shape}>
          <rect x={cx - 3 * P} y={cy - P} width={2 * P} height={P} fill={ink} />
          <rect x={cx - P} y={cy} width={2 * P} height={P} fill={ink} />
          <rect x={cx + P} y={cy - P} width={2 * P} height={P} fill={ink} />
          <rect x={cx + 2 * P} y={cy + 2 * P} width={P} height={P} fill="#5599DD">
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" />
          </rect>
        </g>
      );
    case 'wide':
      // 5x5 outer block, 3x3 inner pupil that pulses.
      return (
        <g shapeRendering={shape}>
          <rect
            x={cx - 2.5 * P}
            y={cy - 2.5 * P}
            width={5 * P}
            height={5 * P}
            fill={paper}
            stroke={ink}
            strokeWidth={6}
          />
          <rect x={cx - 1.5 * P} y={cy - 1.5 * P} width={3 * P} height={3 * P} fill={ink}>
            <animate
              attributeName="width"
              values={`${3 * P};${2 * P};${3 * P}`}
              dur="0.6s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      );
    case 'closed':
      // Single horizontal pixel-bar with subtle bob.
      return (
        <g shapeRendering={shape}>
          <rect x={cx - 3 * P} y={cy} width={6 * P} height={P} fill={ink}>
            <animate
              attributeName="y"
              values={`${cy};${cy - P / 2};${cy}`}
              dur="3.5s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      );
    case 'lookUp':
      // 3x4 eye box, pupil rect at top, slides horizontally to read as "looking around"
      return (
        <g shapeRendering={shape}>
          <rect
            x={cx - 1.5 * P}
            y={cy - 2 * P}
            width={3 * P}
            height={4 * P}
            fill={ink}
          />
          <rect x={cx - 0.5 * P} y={cy - 1.5 * P} width={P} height={P} fill={paper}>
            <animate
              attributeName="x"
              values={`${cx - 0.5 * P};${cx - 1.5 * P};${cx - 0.5 * P}`}
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      );
    case 'narrow':
      // Thin horizontal strip with a small pupil that darts side to side.
      return (
        <g shapeRendering={shape}>
          <rect x={cx - 2.5 * P} y={cy} width={5 * P} height={P} fill={ink} />
          <rect x={cx + P} y={cy} width={P} height={P} fill={paper}>
            <animate
              attributeName="x"
              values={`${cx + P};${cx - 2 * P};${cx + P}`}
              dur="1.2s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      );
    case 'sparkle':
      // Solid pixel pupil + 4-pixel star sparkle pulsing in the corner.
      return (
        <g shapeRendering={shape}>
          <rect
            x={cx - 1.5 * P}
            y={cy - 2 * P}
            width={3 * P}
            height={4 * P}
            fill={ink}
          />
          <g style={{ transformOrigin: `${cx - P / 2}px ${cy - P}px` }}>
            <rect x={cx - P} y={cy - 1.5 * P} width={P} height={P} fill={paper}>
              <animate
                attributeName="opacity"
                values="1;0.4;1"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </rect>
            <rect x={cx} y={cy - 1.5 * P} width={P / 2} height={P / 2} fill={paper} opacity={0.85} />
          </g>
        </g>
      );
    case 'asymm': {
      // Left eye larger, right smaller — pixel-style asymmetric reads "off".
      const w = isLeft ? 4 * P : 3 * P;
      const h = isLeft ? 5 * P : 3.5 * P;
      return (
        <g shapeRendering={shape}>
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill={ink}>
            <animate
              attributeName="width"
              values={`${w};${w - P};${w}`}
              dur="2.4s"
              repeatCount="indefinite"
            />
          </rect>
          <rect
            x={cx - P / 2}
            y={cy - h / 2 + P}
            width={P}
            height={P}
            fill={paper}
          />
        </g>
      );
    }
    case 'cross': {
      // Pupils pushed into opposite corners — pixel-crossed-eyes.
      const offset = isLeft ? P : -P;
      return (
        <g shapeRendering={shape}>
          <rect
            x={cx - 1.5 * P}
            y={cy - 2 * P}
            width={3 * P}
            height={4 * P}
            fill={ink}
          />
          <rect x={cx + offset - P / 2} y={cy - 1.5 * P} width={P} height={P} fill={paper}>
            <animate
              attributeName="y"
              values={`${cy - 1.5 * P};${cy - 2 * P};${cy - 1.5 * P}`}
              dur="2.5s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      );
    }
    case 'x':
      // 5-pixel X — classic 8-bit "dead" eyes.
      return (
        <g shapeRendering={shape}>
          {Array.from({ length: 5 }).map((_, i) => {
            const off = (i - 2) * P;
            return (
              <g key={i}>
                <rect x={cx + off} y={cy + off} width={P} height={P} fill={ink} />
                <rect x={cx + off} y={cy - off - P} width={P} height={P} fill={ink} />
              </g>
            );
          })}
        </g>
      );
    case 'normal':
    default:
      // 3x4 pixel block with a small white catchlight that drifts.
      return (
        <g shapeRendering={shape}>
          <rect
            x={cx - 1.5 * P}
            y={cy - 2 * P}
            width={3 * P}
            height={4 * P}
            fill={ink}
          />
          <rect x={cx - 0.5 * P} y={cy - 1.5 * P} width={P} height={P} fill={paper}>
            <animate
              attributeName="x"
              values={`${cx - 0.5 * P};${cx - 1.5 * P};${cx - 0.5 * P}`}
              dur="6s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      );
  }
}

// The "Toon" family: chunky cartoon-monster look inspired by bold-outline
// character art. Heavy black eye outlines, large white sclera, prominent
// black pupils with crisp catchlights, and a touch of menace where the
// mood permits (cross + asymm + sparkle especially). Built from thick
// stroked ellipses and arcs so the family reads as confident and graphic.
function ToonEye({ style, cx, cy, isLeft }: FamilyEyeProps) {
  const { ink, paper, isDark } = useFaceInk();
  const STROKE = 18;
  const haloOpacity = isDark ? 0.22 : 0.08;

  switch (style) {
    case 'happy':
      // Crescent (closed) curving up — classic happy cartoon eye.
      return (
        <>
          <ellipse cx={cx} cy={cy + 6} rx={88} ry={48} fill={ink} opacity={haloOpacity} />
          <path
            d={`M ${cx - 90} ${cy + 30} Q ${cx} ${cy - 95} ${cx + 90} ${cy + 30}`}
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values={`M ${cx - 90} ${cy + 30} Q ${cx} ${cy - 95} ${cx + 90} ${cy + 30};M ${cx - 90} ${cy + 22} Q ${cx} ${cy - 110} ${cx + 90} ${cy + 22};M ${cx - 90} ${cy + 30} Q ${cx} ${cy - 95} ${cx + 90} ${cy + 30}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );
    case 'sad':
      // Tilted almond sloping down at the outer corner + a teardrop.
      return (
        <>
          <ellipse
            cx={cx}
            cy={cy + 10}
            rx={78}
            ry={70}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 2}
          />
          <ellipse cx={cx - 14} cy={cy + 30} rx={20} ry={28} fill={ink} />
          <ellipse cx={cx - 22} cy={cy + 18} rx={5} ry={7} fill={paper} />
          <path
            d={`M ${cx + 32} ${cy + 70} Q ${cx + 28} ${cy + 120} ${cx + 50} ${cy + 140}`}
            stroke="#5599DD"
            strokeWidth={12}
            strokeLinecap="round"
            fill="none"
          >
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" />
          </path>
        </>
      );
    case 'wide':
      // Huge round eye with small darting pupil — startled cartoon stare.
      return (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={92}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 1.5}
          />
          <circle cx={cx + 6} cy={cy - 6} r={28} fill={ink}>
            <animate attributeName="r" values="28;24;28" dur="0.55s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + 14} cy={cy - 14} r={7} fill={paper} />
        </>
      );
    case 'closed':
      // Heavy down-curve arc — eyes shut tight, cartoon-style.
      return (
        <>
          <ellipse cx={cx} cy={cy + 12} rx={86} ry={46} fill={ink} opacity={haloOpacity} />
          <path
            d={`M ${cx - 88} ${cy} Q ${cx} ${cy + 55} ${cx + 88} ${cy}`}
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values={`M ${cx - 88} ${cy} Q ${cx} ${cy + 55} ${cx + 88} ${cy};M ${cx - 88} ${cy} Q ${cx} ${cy + 62} ${cx + 88} ${cy};M ${cx - 88} ${cy} Q ${cx} ${cy + 55} ${cx + 88} ${cy}`}
              dur="3.5s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );
    case 'lookUp':
      // Big almond with the pupil parked at the top — looking up at a thought.
      return (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={72}
            ry={88}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 1.5}
          />
          <ellipse cx={cx + 12} cy={cy - 56} rx={22} ry={28} fill={ink}>
            <animate
              attributeName="cx"
              values={`${cx + 12};${cx - 12};${cx + 12}`}
              dur="3s"
              repeatCount="indefinite"
            />
          </ellipse>
        </>
      );
    case 'narrow':
      // Thick horizontal slit — the cartoon "side-eye".
      return (
        <>
          <ellipse
            cx={cx}
            cy={cy + 8}
            rx={84}
            ry={20}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 1.5}
          />
          <ellipse cx={cx + 22} cy={cy + 6} rx={16} ry={14} fill={ink}>
            <animate
              attributeName="cx"
              values={`${cx + 22};${cx - 22};${cx + 22}`}
              dur="1.2s"
              repeatCount="indefinite"
            />
          </ellipse>
        </>
      );
    case 'sparkle': {
      // Big shiny eye with a chunky 4-point star that throbs.
      const sx = cx - 8;
      const sy = cy - 18;
      const r = 22;
      return (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={72}
            ry={90}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 1.5}
          />
          <ellipse cx={cx} cy={cy + 8} rx={36} ry={48} fill={ink} />
          <g style={{ transformOrigin: `${sx}px ${sy}px` }}>
            <path
              d={`M ${sx} ${sy - r} L ${sx + r * 0.32} ${sy - r * 0.32} L ${sx + r} ${sy} L ${sx + r * 0.32} ${sy + r * 0.32} L ${sx} ${sy + r} L ${sx - r * 0.32} ${sy + r * 0.32} L ${sx - r} ${sy} L ${sx - r * 0.32} ${sy - r * 0.32} Z`}
              fill={paper}
            >
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1.2;0.9;1"
                dur="1.4s"
                repeatCount="indefinite"
                additive="sum"
              />
            </path>
          </g>
          <circle cx={cx + 20} cy={cy + 28} r={6} fill={paper} opacity={0.85} />
        </>
      );
    }
    case 'asymm': {
      // One big bug-eye, one small squint — classic toon "off" expression.
      const rx = isLeft ? 78 : 48;
      const ry = isLeft ? 92 : 60;
      const pupilRx = isLeft ? 22 : 14;
      const pupilRy = isLeft ? 28 : 16;
      const pupilDy = isLeft ? 26 : 16;
      return (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 1.5}
          >
            <animate
              attributeName="rx"
              values={`${rx};${rx - 8};${rx}`}
              dur="2.4s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse
            cx={cx + 14}
            cy={cy - pupilDy}
            rx={pupilRx}
            ry={pupilRy}
            fill={ink}
          />
          <ellipse cx={cx + 22} cy={cy - pupilDy - 8} rx={6} ry={8} fill={paper} />
        </>
      );
    }
    case 'cross': {
      // Pupils pulled hard toward the nose — full cross-eyed silly.
      const offset = isLeft ? 32 : -32;
      return (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={72}
            ry={88}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 1.5}
          />
          <ellipse cx={cx + offset} cy={cy - 6} rx={22} ry={30} fill={ink}>
            <animate
              attributeName="cy"
              values={`${cy - 6};${cy - 22};${cy - 6}`}
              dur="2.5s"
              repeatCount="indefinite"
            />
          </ellipse>
        </>
      );
    }
    case 'x':
      // Chunky X — heavy black slashes, bolder than the round-family X.
      return (
        <>
          <line
            x1={cx - 60}
            y1={cy - 60}
            x2={cx + 60}
            y2={cy + 60}
            stroke={ink}
            strokeWidth={STROKE * 1.6}
            strokeLinecap="round"
          />
          <line
            x1={cx - 60}
            y1={cy + 60}
            x2={cx + 60}
            y2={cy - 60}
            stroke={ink}
            strokeWidth={STROKE * 1.6}
            strokeLinecap="round"
          />
        </>
      );
    case 'normal':
    default:
      // Default: big almond with a strong outline + offset pupil + catchlight.
      return (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={72}
            ry={92}
            fill={paper}
            stroke={ink}
            strokeWidth={STROKE / 1.5}
          />
          <ellipse cx={cx + 12} cy={cy - 18} rx={28} ry={36} fill={ink}>
            <animate
              attributeName="cx"
              values={`${cx + 12};${cx - 6};${cx + 14};${cx + 12}`}
              dur="6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${cy - 18};${cy - 26};${cy - 12};${cy - 18}`}
              dur="6s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse cx={cx + 22} cy={cy - 28} rx={9} ry={12} fill={paper} opacity={0.9} />
        </>
      );
  }
}

// Toon teeth: chunky rectangular row across the wide-open mouths, plus a
// signature fang on the "angry" snarl (flat mouth) so the monster aesthetic
// reads even when the mouth is mostly closed.
function ToonTeeth({ mouth, ink }: { mouth: MouthStyle; ink: string }) {
  // Per-expression layout — top-row teeth + occasional fangs.
  // x range and y position vary per mouth shape so teeth sit visually inside
  // the path's opening, not floating in the cavity above or below.
  const config: Partial<
    Record<
      MouthStyle,
      { startX: number; endX: number; y: number; h: number; cols: number; fangs?: boolean }
    >
  > = {
    bigSmile: { startX: 250, endX: 750, y: 678, h: 50, cols: 6 },
    tongueOut: { startX: 250, endX: 750, y: 678, h: 38, cols: 6 },
    openO: { startX: 410, endX: 590, y: 660, h: 30, cols: 3 },
    singO: { startX: 410, endX: 590, y: 680, h: 26, cols: 2 },
    talk_a: { startX: 290, endX: 710, y: 678, h: 38, cols: 5 },
    talk_e: { startX: 290, endX: 710, y: 720, h: 22, cols: 5 },
    talk_o: { startX: 440, endX: 560, y: 700, h: 22, cols: 2 },
    talk_i: { startX: 320, endX: 680, y: 718, h: 16, cols: 6 },
    talk_m: { startX: 380, endX: 620, y: 728, h: 12, cols: 5 },
    flat: { startX: 360, endX: 640, y: 730, h: 14, cols: 4, fangs: true },
  };

  const c = config[mouth];
  if (!c) return null;
  const w = (c.endX - c.startX) / c.cols;

  return (
    <>
      {Array.from({ length: c.cols }).map((_, i) => (
        <rect
          key={i}
          x={c.startX + i * w + 4}
          y={c.y}
          width={w - 8}
          height={c.h}
          fill="#fdf6e3"
          stroke={ink}
          strokeWidth={4}
          rx={3}
        />
      ))}
      {c.fangs && (
        // Two pointy fangs hanging from the upper jaw line — signature toon
        // snarl detail. Triangle paths layered over the rectangular row.
        <>
          <path d="M 410 730 L 430 730 L 420 770 Z" fill="#fdf6e3" stroke={ink} strokeWidth={3} />
          <path d="M 570 730 L 590 730 L 580 770 Z" fill="#fdf6e3" stroke={ink} strokeWidth={3} />
        </>
      )}
    </>
  );
}

export function Brows({ style }: { style: BrowStyle }) {
  const { ink } = useFaceInk();
  switch (style) {
    case 'sad':
      return (
        <>
          <path
            d="M 250 290 Q 320 245 390 280"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 610 280 Q 680 245 750 290"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case 'high':
      return (
        <>
          <path
            d="M 250 230 Q 320 195 390 230"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M 250 230 Q 320 195 390 230;M 250 215 Q 320 170 390 215;M 250 230 Q 320 195 390 230"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M 610 230 Q 680 195 750 230"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M 610 230 Q 680 195 750 230;M 610 215 Q 680 170 750 215;M 610 230 Q 680 195 750 230"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );
    case 'angry':
      return (
        <>
          <path d="M 250 240 L 390 295" stroke={ink} strokeWidth={24} strokeLinecap="round">
            <animate
              attributeName="d"
              values="M 250 240 L 390 295;M 250 250 L 390 285;M 250 240 L 390 295"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M 610 295 L 750 240" stroke={ink} strokeWidth={24} strokeLinecap="round">
            <animate
              attributeName="d"
              values="M 610 295 L 750 240;M 610 285 L 750 250;M 610 295 L 750 240"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );
    case 'quirked':
      return (
        <>
          <path
            d="M 250 275 Q 320 265 390 270"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 610 245 Q 680 210 750 235"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M 610 245 Q 680 210 750 235;M 610 230 Q 680 185 750 220;M 610 245 Q 680 210 750 235"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );
    case 'asymm':
      return (
        <>
          <path
            d="M 250 245 Q 320 215 390 250"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M 250 245 Q 320 215 390 250;M 250 260 Q 320 240 390 265;M 250 245 Q 320 215 390 250"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M 610 285 Q 680 280 750 280"
            stroke={ink}
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M 610 285 Q 680 280 750 280;M 610 270 Q 680 245 750 260;M 610 285 Q 680 280 750 280"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </path>
        </>
      );
    case 'none':
    default:
      return null;
  }
}

export function Accessories({ mood }: { mood: MoodKey }) {
  const { ink } = useFaceInk();
  const bungee = 'Bungee, sans-serif';
  switch (mood) {
    case 'sleepy':
      // Floating Z's are always cream — they're ambient decorations, not part
      // of the face's contrast pair. On a dark agent the cream pops; on a
      // saturated mid-tone agent the cream reads as a soft warm halo.
      return (
        <>
          <text
            className="acc anim-z"
            x={760}
            y={220}
            fontFamily={bungee}
            fontSize={90}
            fill={ink}
            style={{ animationDelay: '0s' }}
          >
            z
          </text>
          <text
            className="acc anim-z"
            x={760}
            y={220}
            fontFamily={bungee}
            fontSize={70}
            fill={ink}
            style={{ animationDelay: '0.9s' }}
          >
            z
          </text>
          <text
            className="acc anim-z"
            x={760}
            y={220}
            fontFamily={bungee}
            fontSize={55}
            fill={ink}
            style={{ animationDelay: '1.7s' }}
          >
            z
          </text>
        </>
      );
    case 'thinking':
      return (
        <>
          <circle
            className="acc anim-think"
            cx={780}
            cy={210}
            r={16}
            fill="#fdf6e3"
            stroke={ink}
            strokeWidth={4}
            style={{ transformOrigin: '780px 210px', animationDelay: '0s' }}
          />
          <circle
            className="acc anim-think"
            cx={835}
            cy={165}
            r={12}
            fill="#fdf6e3"
            stroke={ink}
            strokeWidth={4}
            style={{ transformOrigin: '835px 165px', animationDelay: '0.3s' }}
          />
          <circle
            className="acc anim-think"
            cx={878}
            cy={125}
            r={9}
            fill="#fdf6e3"
            stroke={ink}
            strokeWidth={3}
            style={{ transformOrigin: '878px 125px', animationDelay: '0.6s' }}
          />
        </>
      );
    case 'excited':
      return (
        <>
          <path
            className="acc anim-star"
            d="M 150 220 m 0 -45 l 13 31 l 34 0 l -27 21 l 10 33 l -30 -18 l -30 18 l 10 -33 l -27 -21 l 34 0 Z"
            fill="#FFE600"
            stroke={ink}
            strokeWidth={5}
            style={{ transformOrigin: '150px 220px' }}
          />
          <path
            className="acc anim-star"
            d="M 850 180 m 0 -38 l 11 26 l 29 0 l -23 18 l 8 28 l -25 -15 l -25 15 l 8 -28 l -23 -18 l 29 0 Z"
            fill="#FFE600"
            stroke={ink}
            strokeWidth={5}
            style={{ transformOrigin: '850px 180px', animationDelay: '0.3s' }}
          />
          <path
            className="acc anim-star"
            d="M 130 780 m 0 -32 l 9 22 l 24 0 l -19 15 l 7 24 l -21 -13 l -21 13 l 7 -24 l -19 -15 l 24 0 Z"
            fill="#FFE600"
            stroke={ink}
            strokeWidth={4}
            style={{ transformOrigin: '130px 780px', animationDelay: '0.6s' }}
          />
        </>
      );
    case 'singing':
      return (
        <>
          <text
            className="acc anim-note"
            x={170}
            y={250}
            fontFamily={bungee}
            fontSize={74}
            fill={ink}
            style={{ animationDelay: '0s' }}
          >
            ♪
          </text>
          <text
            className="acc anim-note"
            x={790}
            y={240}
            fontFamily={bungee}
            fontSize={92}
            fill={ink}
            style={{ animationDelay: '0.9s' }}
          >
            ♫
          </text>
          <text
            className="acc anim-note"
            x={100}
            y={780}
            fontFamily={bungee}
            fontSize={58}
            fill={ink}
            style={{ animationDelay: '1.6s' }}
          >
            ♪
          </text>
        </>
      );
    case 'angry':
      return (
        <>
          <path
            className="acc anim-puff"
            d="M 130 250 Q 165 240 145 270 Q 180 260 160 295 Q 195 285 175 320"
            stroke="#FFE600"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
            style={{ transformOrigin: '160px 285px' }}
          />
          <path
            className="acc anim-puff"
            d="M 870 250 Q 835 240 855 270 Q 820 260 840 295 Q 805 285 825 320"
            stroke="#FFE600"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
            style={{ transformOrigin: '840px 285px', animationDelay: '0.15s' }}
          />
        </>
      );
    case 'error':
      // Same logic as the sleepy Z's — always cream so they read as warning
      // bursts regardless of face color.
      return (
        <>
          <text
            className="acc anim-shake"
            x={120}
            y={240}
            fontFamily={bungee}
            fontSize={80}
            fill={ink}
            style={{ transformOrigin: '140px 220px' }}
          >
            !
          </text>
          <text
            className="acc anim-shake"
            x={820}
            y={240}
            fontFamily={bungee}
            fontSize={80}
            fill={ink}
            style={{ transformOrigin: '840px 220px', animationDelay: '0.17s' }}
          >
            !
          </text>
        </>
      );
    case 'surprised':
      return (
        <text
          className="acc anim-shake"
          x={800}
          y={240}
          fontFamily={bungee}
          fontSize={110}
          fill={ink}
          style={{ transformOrigin: '825px 215px' }}
        >
          !
        </text>
      );
    case 'confused':
      return (
        <text
          className="acc anim-bob"
          x={800}
          y={230}
          fontFamily={bungee}
          fontSize={100}
          fill="#fdf6e3"
          stroke={ink}
          strokeWidth={3}
          style={{ transformOrigin: '830px 205px' }}
        >
          ?
        </text>
      );
    case 'silly':
      return (
        <>
          <path
            className="acc anim-puff"
            d="M 140 200 Q 200 150 180 220"
            fill="none"
            stroke={ink}
            strokeWidth={6}
            strokeLinecap="round"
            style={{ transformOrigin: '170px 190px' }}
          />
          <path
            className="acc anim-puff"
            d="M 860 200 Q 800 150 820 220"
            fill="none"
            stroke={ink}
            strokeWidth={6}
            strokeLinecap="round"
            style={{ transformOrigin: '830px 190px', animationDelay: '0.2s' }}
          />
        </>
      );
    default:
      return null;
  }
}

export function Teeth({ mouth, family }: { mouth: MouthStyle; family: MouthFamily }) {
  const { ink } = useFaceInk();

  // The "Toon" family shows chunkier teeth across many more expressions to
  // sell the cartoon-monster look — wide grin, snarl, gasp, lipsync poses all
  // show a row of teeth, and a few moods get a single fang.
  if (family === 'toon') return <ToonTeeth mouth={mouth} ink={ink} />;

  // Curve/Pixel families: original behavior — a row of teeth for the wide
  // smile poses only.
  const show: MouthStyle[] = ['bigSmile', 'talk_a', 'talk_e'];
  if (!show.includes(mouth)) return null;
  const cols = 5;
  const startX = 310;
  const endX = 690;
  const y = 685;
  const h = 38;
  const w = (endX - startX) / cols;
  // Teeth are real white objects inside the mouth — they don't invert with
  // the personality color. Stroke flips so the gaps stay visible on dark faces.
  return (
    <>
      {Array.from({ length: cols }).map((_, i) => (
        <rect
          key={i}
          x={startX + i * w + 3}
          y={y}
          width={w - 6}
          height={h}
          fill="#fdf6e3"
          stroke={ink}
          strokeWidth={3}
          rx={2}
        />
      ))}
    </>
  );
}
