import type { BrowStyle, EyeStyle, MoodKey, MouthStyle } from '@shared/moods';

// React/JSX SVG primitives for every facial feature. Rendering these as real
// React children (rather than parsed string fragments) lets the SMIL <animate>
// elements activate properly under the live SVG document.

interface EyeProps {
  style: EyeStyle;
  cx: number;
  cy: number;
  isLeft: boolean;
}

export function Eye({ style, cx, cy, isLeft }: EyeProps) {
  switch (style) {
    case 'happy':
      return (
        <>
          {/* Soft eye-socket shadow so the arc has visual weight even when curled up */}
          <ellipse cx={cx} cy={cy + 5} rx={75} ry={45} fill="#0a0a0a" opacity={0.08} />
          <path
            d={`M ${cx - 80} ${cy + 25} Q ${cx} ${cy - 80} ${cx + 80} ${cy + 25}`}
            stroke="#0a0a0a"
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
          <ellipse cx={cx} cy={cy + 5} rx={58} ry={72} fill="#0a0a0a" />
          <ellipse cx={cx - 12} cy={cy + 28} rx={13} ry={16} fill="white" />
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
          <circle cx={cx} cy={cy} r={78} fill="white" stroke="#0a0a0a" strokeWidth={7} />
          <circle cx={cx} cy={cy} r={32} fill="#0a0a0a">
            <animate attributeName="r" values="32;28;32" dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + 8} cy={cy - 10} r={6} fill="white" />
        </>
      );

    case 'closed':
      return (
        <>
          <ellipse cx={cx} cy={cy + 10} rx={78} ry={42} fill="#0a0a0a" opacity={0.08} />
          <path
            d={`M ${cx - 78} ${cy} Q ${cx} ${cy + 45} ${cx + 78} ${cy}`}
            stroke="#0a0a0a"
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
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill="#0a0a0a" />
          <ellipse cx={cx + 12} cy={cy - 52} rx={16} ry={20} fill="white">
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
          <ellipse cx={cx} cy={cy + 10} rx={68} ry={28} fill="#0a0a0a" />
          <ellipse cx={cx + 18} cy={cy + 5} rx={11} ry={13} fill="white">
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
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill="#0a0a0a" />
          <g style={{ transformOrigin: `${sx}px ${sy}px` }}>
            <path
              d={`M ${sx} ${sy - r} L ${sx + r * 0.32} ${sy - r * 0.32} L ${sx + r} ${sy} L ${sx + r * 0.32} ${sy + r * 0.32} L ${sx} ${sy + r} L ${sx - r * 0.32} ${sy + r * 0.32} L ${sx - r} ${sy} L ${sx - r * 0.32} ${sy - r * 0.32} Z`}
              fill="white"
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
          <circle cx={cx + 18} cy={cy + 20} r={5} fill="white" opacity={0.85} />
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
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#0a0a0a">
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
            fill="white"
          />
        </>
      );
    }

    case 'cross': {
      const offset = isLeft ? 28 : -28;
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill="#0a0a0a" />
          <ellipse cx={cx + offset} cy={cy - 8} rx={16} ry={22} fill="white">
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
            stroke="#0a0a0a"
            strokeWidth={24}
            strokeLinecap="round"
          />
          <line
            x1={cx - 55}
            y1={cy + 55}
            x2={cx + 55}
            y2={cy - 55}
            stroke="#0a0a0a"
            strokeWidth={24}
            strokeLinecap="round"
          />
        </>
      );

    case 'normal':
    default:
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={62} ry={82} fill="#0a0a0a" />
          <ellipse cx={cx + 14} cy={cy - 22} rx={16} ry={22} fill="white">
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
          <ellipse cx={cx + 8} cy={cy - 26} rx={6} ry={9} fill="white" opacity={0.8} />
        </>
      );
  }
}

export function Brows({ style }: { style: BrowStyle }) {
  switch (style) {
    case 'sad':
      return (
        <>
          <path
            d="M 250 290 Q 320 245 390 280"
            stroke="#0a0a0a"
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 610 280 Q 680 245 750 290"
            stroke="#0a0a0a"
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
            stroke="#0a0a0a"
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
            stroke="#0a0a0a"
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
          <path d="M 250 240 L 390 295" stroke="#0a0a0a" strokeWidth={24} strokeLinecap="round">
            <animate
              attributeName="d"
              values="M 250 240 L 390 295;M 250 250 L 390 285;M 250 240 L 390 295"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M 610 295 L 750 240" stroke="#0a0a0a" strokeWidth={24} strokeLinecap="round">
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
            stroke="#0a0a0a"
            strokeWidth={20}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 610 245 Q 680 210 750 235"
            stroke="#0a0a0a"
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
            stroke="#0a0a0a"
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
            stroke="#0a0a0a"
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
  const bungee = 'Bungee, sans-serif';
  switch (mood) {
    case 'sleepy':
      return (
        <>
          <text
            className="acc anim-z"
            x={760}
            y={220}
            fontFamily={bungee}
            fontSize={90}
            fill="#fdf6e3"
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
            fill="#fdf6e3"
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
            fill="#fdf6e3"
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
            fill="white"
            stroke="#0a0a0a"
            strokeWidth={4}
            style={{ transformOrigin: '780px 210px', animationDelay: '0s' }}
          />
          <circle
            className="acc anim-think"
            cx={835}
            cy={165}
            r={12}
            fill="white"
            stroke="#0a0a0a"
            strokeWidth={4}
            style={{ transformOrigin: '835px 165px', animationDelay: '0.3s' }}
          />
          <circle
            className="acc anim-think"
            cx={878}
            cy={125}
            r={9}
            fill="white"
            stroke="#0a0a0a"
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
            stroke="#0a0a0a"
            strokeWidth={5}
            style={{ transformOrigin: '150px 220px' }}
          />
          <path
            className="acc anim-star"
            d="M 850 180 m 0 -38 l 11 26 l 29 0 l -23 18 l 8 28 l -25 -15 l -25 15 l 8 -28 l -23 -18 l 29 0 Z"
            fill="#FFE600"
            stroke="#0a0a0a"
            strokeWidth={5}
            style={{ transformOrigin: '850px 180px', animationDelay: '0.3s' }}
          />
          <path
            className="acc anim-star"
            d="M 130 780 m 0 -32 l 9 22 l 24 0 l -19 15 l 7 24 l -21 -13 l -21 13 l 7 -24 l -19 -15 l 24 0 Z"
            fill="#FFE600"
            stroke="#0a0a0a"
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
            fill="#0a0a0a"
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
            fill="#0a0a0a"
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
            fill="#0a0a0a"
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
      return (
        <>
          <text
            className="acc anim-shake"
            x={120}
            y={240}
            fontFamily={bungee}
            fontSize={80}
            fill="#fdf6e3"
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
            fill="#fdf6e3"
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
          fill="#0a0a0a"
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
          stroke="#0a0a0a"
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
            stroke="#0a0a0a"
            strokeWidth={6}
            strokeLinecap="round"
            style={{ transformOrigin: '170px 190px' }}
          />
          <path
            className="acc anim-puff"
            d="M 860 200 Q 800 150 820 220"
            fill="none"
            stroke="#0a0a0a"
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

export function Teeth({ mouth }: { mouth: MouthStyle }) {
  const show: MouthStyle[] = ['bigSmile', 'singO', 'talk_a', 'talk_e', 'tongueOut'];
  if (!show.includes(mouth)) return null;
  const cols = 5;
  const startX = 310;
  const endX = 690;
  const y = 685;
  const h = 38;
  const w = (endX - startX) / cols;
  return (
    <>
      {Array.from({ length: cols }).map((_, i) => (
        <rect
          key={i}
          x={startX + i * w + 3}
          y={y}
          width={w - 6}
          height={h}
          fill="white"
          stroke="#0a0a0a"
          strokeWidth={3}
          rx={2}
        />
      ))}
    </>
  );
}
