import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  MOODS,
  TALK_MOUTHS,
  resolveFaceParts,
  type AgentTraits,
  type MoodKey,
  type MouthStyle,
} from '@shared/moods';
import {
  Accessories,
  Beard,
  bodyClipPathFor,
  Brows,
  Cheeks,
  Eye,
  Glasses,
  Hair,
  Mustache,
  Teeth,
} from './FaceParts';
import { FaceInkContext, type FaceInk } from './faceInk';
import { mouthPathFor, tonguePath } from './mouthPaths';

// Flip the linework to a light token when the agent picked a dark color, so
// the eyes/brows/mouth don't disappear into a black-on-black face. `paper`
// tracks `ink`'s opposite for highlights (pupils, sclera, teeth).
function inkForBackground(hex: string): FaceInk {
  const c = (hex || '').replace('#', '');
  const v = c.length === 3 ? c.split('').map((ch) => ch + ch).join('') : c;
  if (v.length !== 6 || !/^[0-9a-fA-F]+$/.test(v))
    return { ink: '#0a0a0a', paper: '#ffffff', isDark: false };
  const channel = (start: number) => parseInt(v.slice(start, start + 2), 16) / 255;
  const r = channel(0);
  const g = channel(2);
  const b = channel(4);
  const lin = (x: number) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // Only flip on genuinely dark personality colors — saturated mid-tones like
  // crimson or navy still read fine with the default dark linework.
  return luminance < 0.12
    ? { ink: '#fffaeb', paper: '#0a0a0a', isDark: true }
    : { ink: '#0a0a0a', paper: '#ffffff', isDark: false };
}

interface FaceProps {
  mood: MoodKey;
  color: string;
  name: string;
  status?: string | null;
  updatedAt?: string;
  speakingText?: string | null;
  onSpeechEnd?: () => void;
  // Optional manual-dismiss callback. When provided, a small X button appears
  // on hover that lets the viewer hide this card until the next update arrives.
  onDismiss?: () => void;
  voice?: SpeechSynthesisVoice | null;
  pitch?: number;
  rate?: number;
  muted?: boolean;
  volume?: number;
  // Owner-set persistent visual traits. null/undefined → built-in face.
  traits?: AgentTraits | null;
  // When true, the owner-only "Customize" affordance is rendered. It appears
  // as an always-visible badge for agents that have never been customized
  // (and whose hint hasn't been dismissed), and reverts to a hover-only
  // button once the owner has either used it or dismissed the hint.
  isOwner?: boolean;
  agentId?: string;
  onCustomize?: (agentId: string) => void;
  // When true, suppresses chrome that's only useful on the live grid: the
  // mood-name chip in the top-left and the name/status row beneath the tile.
  // Used by MugBuilder picker thumbnails (the chip on every tile would just
  // say IDLE and cover the face) and the 12-mood preview (the mood name is
  // already shown below each tile).
  compact?: boolean;
}

// Staleness shrink: 2% per minute, but never below half-size. Faces hold at
// 50% for hours so a user returning the next morning still finds their grid.
// Activity (mood change, speech) resets updatedAt server-side, so the face
// pops back to full size whenever an agent reports in. After 24 hours
// without activity we drop the face from the grid entirely.
const SHRINK_PER_MIN = 0.02;
const MIN_SHRINK_SCALE = 0.5;
export const DESPAWN_AFTER_MIN = 24 * 60;

// Threshold below which the stale badge stays hidden — keeps brand-new faces clean.
const STALE_BADGE_AFTER_MS = 15_000;

function formatRelative(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}

function useStalenessAge(updatedAt: string | undefined, paused: boolean): number {
  const [age, setAge] = useState(0);
  useEffect(() => {
    if (!updatedAt) {
      setAge(0);
      return;
    }
    const base = new Date(updatedAt).getTime();
    if (Number.isNaN(base)) {
      setAge(0);
      return;
    }
    const tick = () => setAge(Date.now() - base);
    tick();
    if (paused) {
      // While paused (actively speaking or very recently updated), the badge
      // can't appear anyway — skip the per-second re-render churn. Schedule a
      // single timeout to resume ticking once the badge threshold is reachable.
      const elapsed = Date.now() - base;
      const resumeIn = Math.max(0, STALE_BADGE_AFTER_MS - elapsed);
      const t = setTimeout(tick, resumeIn);
      return () => clearTimeout(t);
    }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [updatedAt, paused]);
  return age;
}

function FaceImpl({
  mood,
  color,
  name,
  status,
  updatedAt,
  speakingText,
  onSpeechEnd,
  onDismiss,
  voice = null,
  pitch = 1.4,
  rate = 1.05,
  muted = false,
  volume = 1,
  traits = null,
  isOwner = false,
  agentId,
  onCustomize,
  compact = false,
}: FaceProps) {
  // Pause the staleness ticker while actively speaking — the badge can't
  // render in that state anyway, and we don't need a re-render every second.
  const stalenessPaused = Boolean(speakingText);
  const age = useStalenessAge(updatedAt, stalenessPaused);
  const ageMinutes = speakingText ? 0 : age / 60_000;
  const shrinkScale = Math.max(MIN_SHRINK_SCALE, 1 - SHRINK_PER_MIN * ageMinutes);
  const moodDef = MOODS[mood];
  const [isTalking, setIsTalking] = useState(false);
  const [talkMouth, setTalkMouth] = useState<MouthStyle | null>(null);
  const [popKey, setPopKey] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setPopKey((k) => k + 1);
  }, [mood]);

  useEffect(() => {
    if (!speakingText) return;

    let lastSwap = 0;
    const cycle = (t: number) => {
      if (t - lastSwap > 75 + Math.random() * 80) {
        const idx = Math.floor(Math.random() * TALK_MOUTHS.length);
        setTalkMouth(TALK_MOUTHS[idx]!);
        lastSwap = t;
      }
      rafRef.current = requestAnimationFrame(cycle);
    };

    const finish = () => {
      setIsTalking(false);
      setTalkMouth(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onSpeechEnd?.();
    };

    const canSpeak =
      !muted && typeof window !== 'undefined' && 'speechSynthesis' in window && volume > 0;

    if (!canSpeak) {
      // Still animate mouth and show the bubble for a duration scaled to text length,
      // so muted viewers see the speech bubble for a sensible read time.
      setIsTalking(true);
      rafRef.current = requestAnimationFrame(cycle);
      const readMs = Math.max(1500, Math.min(8000, speakingText.length * 65));
      const timer = window.setTimeout(finish, readMs);
      return () => {
        window.clearTimeout(timer);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();

    const utter = new SpeechSynthesisUtterance(speakingText);
    utter.pitch = pitch;
    utter.rate = rate;
    utter.volume = volume;
    if (voice) utter.voice = voice;

    utter.onstart = () => {
      setIsTalking(true);
      rafRef.current = requestAnimationFrame(cycle);
    };
    utter.onend = finish;
    utter.onerror = finish;

    synth.speak(utter);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (synth.speaking) synth.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakingText, muted, volume]);

  const resolved = useMemo(() => resolveFaceParts(mood, traits), [mood, traits]);

  // First-time hint: agents that have never been customized show the button as
  // an always-visible badge until the owner either visits the builder (traits
  // becomes non-null) or dismisses the hint locally. Dismissal is stored per
  // agent in localStorage; it never touches the DB.
  const hintDismissKey = agentId ? `mugsprite:hint-dismissed:${agentId}` : null;
  const [hintDismissed, setHintDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !hintDismissKey) return false;
    try {
      return window.localStorage.getItem(hintDismissKey) === '1';
    } catch {
      return false;
    }
  });
  const showHint = isOwner && traits === null && !hintDismissed;
  const showCustomizeButton = isOwner && Boolean(onCustomize) && Boolean(agentId);

  const handleCustomize = () => {
    if (!agentId || !onCustomize) return;
    if (hintDismissKey) {
      try {
        window.localStorage.setItem(hintDismissKey, '1');
      } catch {
        /* private mode / quota — fall back to in-memory dismiss */
      }
      setHintDismissed(true);
    }
    onCustomize(agentId);
  };
  const effectiveMouth: MouthStyle =
    isTalking && talkMouth ? talkMouth : resolved.mouthExpression;
  const faceInk = useMemo(() => inkForBackground(color), [color]);

  const timings = useMemo(
    () => ({
      breathDur: (3.2 + Math.random() * 1.3).toFixed(2),
      breathDelay: (-Math.random() * 4).toFixed(2),
      eyeDur: (3.8 + Math.random() * 1.4).toFixed(2),
      eyeDelay: (-Math.random() * 4).toFixed(2),
      mouthDur: (4.5 + Math.random() * 2).toFixed(2),
      mouthDelay: (-Math.random() * 5).toFixed(2),
    }),
    [],
  );

  return (
    <div
      className="flex flex-col gap-1.5 min-w-0 min-h-0 transition-transform duration-1000 ease-out origin-center"
      style={{ transform: `scale(${shrinkScale.toFixed(3)})` }}
    >
      <div
        className={`group relative aspect-square w-full overflow-hidden select-none ${
          resolved.bodyShape === 'square'
            ? 'rounded-[22px] border-[3px] border-ink shadow-brutal-lg'
            : ''
        }`}
        style={{
          // Bake the top-sheen + bottom-shadow gradient INTO the background
          // itself instead of stacking inset overlay divs. Inset divs are
          // positioned against the rectangular bounds, so when clip-path
          // crops the visible area (heart/circle/blob), the gradient ends up
          // mostly outside the visible shape. A background gradient is part
          // of the surface being clipped and naturally follows the shape.
          //
          // Alphas are stronger here than the original square so the depth
          // still reads on non-square shapes that have no border/box-shadow
          // to anchor the eye. The square also benefits — slightly more
          // dimensional than before, still in the same brutalist key.
          backgroundColor: color,
          backgroundImage:
            'linear-gradient(to bottom, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.28) 100%)',
          clipPath: bodyClipPathFor(resolved.bodyShape) || undefined,
          // Box-shadow and border both get clipped by clip-path; for
          // non-square shapes use stacked drop-shadow filters to recreate
          // BOTH the 3px ink outline AND the 6px offset brutal shadow that
          // gives the square its signature chunky neo-brutalist depth.
          //
          // Four directional 3px drop-shadows compound into what reads as
          // a 3px ink outline following the actual silhouette (heart point,
          // blob curves, circle edge). The final 6px shadow is the brutal
          // offset shadow applied to the now-outlined shape.
          filter:
            resolved.bodyShape === 'square'
              ? undefined
              : [
                  'drop-shadow(0 -3px 0 #1a1a1a)',
                  'drop-shadow(0 3px 0 #1a1a1a)',
                  'drop-shadow(-3px 0 0 #1a1a1a)',
                  'drop-shadow(3px 0 0 #1a1a1a)',
                  'drop-shadow(6px 6px 0 #1a1a1a)',
                ].join(' '),
        }}
      >

        {!compact && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-paper/95 text-ink border-2 border-ink rounded-full font-display text-[9px] sm:text-[10px] tracking-widest shadow-brutal-sm z-10">
            {moodDef.label.toUpperCase()}
          </div>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Hide ${name} from the grid until the next update`}
            title="Hide until next update"
            className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 grid place-items-center bg-paper/95 text-ink border-2 border-ink rounded-full font-display text-[11px] sm:text-xs leading-none shadow-brutal-sm z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
          >
            ×
          </button>
        )}

        {showCustomizeButton && (
          <button
            type="button"
            onClick={handleCustomize}
            aria-label={`Customize ${name}'s appearance`}
            title="Customize this mug"
            className={`absolute z-20 font-display text-[9px] sm:text-[10px] tracking-widest leading-none px-2 py-1 bg-accent-yellow text-ink border-2 border-ink rounded-full shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition ${
              onDismiss ? 'top-10' : 'top-2'
            } right-2 ${
              showHint
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto'
            }`}
          >
            ✎ {showHint ? 'CUSTOMIZE' : 'EDIT'}
          </button>
        )}

        {age >= STALE_BADGE_AFTER_MS && !speakingText && (
          <div
            className={`absolute top-2.5 px-2 py-0.5 bg-ink/80 text-paper rounded-full font-display text-[8px] sm:text-[9px] tracking-widest z-10 transition-all duration-150 ${
              onDismiss
                ? 'right-2.5 group-hover:right-11 group-focus-within:right-11'
                : 'right-2.5'
            }`}
            title={`Last update ${formatRelative(age)} ago`}
          >
            {formatRelative(age)}
          </div>
        )}

        {speakingText && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-2 z-20 pointer-events-none w-[88%]"
            role="status"
            aria-live="polite"
          >
            <div className="relative bg-paper border-[3px] border-ink rounded-2xl px-3 py-2 shadow-brutal-sm text-ink text-[11px] sm:text-xs leading-snug font-sans">
              {speakingText}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 bg-paper border-b-[3px] border-r-[3px] border-ink rotate-45"
              />
            </div>
          </div>
        )}

        <FaceInkContext.Provider value={faceInk}>
        <div key={popKey} className="face-pop popping">
          <div className={`face-bob ${isTalking ? 'bobbing' : ''}`}>
            <div
              className="face-breath"
              style={{
                animationDuration: `${timings.breathDur}s`,
                animationDelay: `${timings.breathDelay}s`,
              }}
            >
              <svg
                className="face-svg"
                viewBox="0 0 1000 1000"
                data-eyes={resolved.eyesExpression}
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`${name} agent — ${moodDef.label}`}
              >
                {/* In-SVG gradient overlay. Drawn at the back so face features
                    render on top. Inside the SVG it's guaranteed to render
                    within the clipped silhouette (heart/circle/blob/etc.)
                    regardless of how CSS clip-path treats container-level
                    backgrounds. Subtle enough to not muddy the features. */}
                <defs>
                  <linearGradient id="mug-face-shading" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
                    <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="60%" stopColor="#000000" stopOpacity="0" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
                  </linearGradient>
                </defs>
                <rect
                  x={0}
                  y={0}
                  width={1000}
                  height={1000}
                  fill="url(#mug-face-shading)"
                  pointerEvents="none"
                />
                <g className="hair" aria-hidden>
                  <Hair family={resolved.hairFamily} />
                </g>
                <g className="accessories">
                  <Accessories mood={mood} />
                </g>
                <g className="cheeks" aria-hidden>
                  <Cheeks family={resolved.cheeksFamily} />
                </g>
                <g className="brows">
                  <Brows family={resolved.browsFamily} style={resolved.browsExpression} />
                </g>
                <g
                  className="leftEye"
                  style={{
                    animationDuration: `${timings.eyeDur}s`,
                    animationDelay: `${timings.eyeDelay}s`,
                  }}
                >
                  <Eye
                    family={resolved.eyesFamily}
                    expression={resolved.eyesExpression}
                    cx={320}
                    cy={380}
                    isLeft={true}
                  />
                </g>
                <g
                  className="rightEye"
                  style={{
                    animationDuration: `${timings.eyeDur}s`,
                    animationDelay: `${timings.eyeDelay}s`,
                  }}
                >
                  <Eye
                    family={resolved.eyesFamily}
                    expression={resolved.eyesExpression}
                    cx={680}
                    cy={380}
                    isLeft={false}
                  />
                </g>
                <g className="glasses" aria-hidden>
                  <Glasses family={resolved.glassesFamily} />
                </g>
                <g className="mustache" aria-hidden>
                  <Mustache family={resolved.mustacheFamily} />
                </g>
                <g
                  className="mouthGroup"
                  style={{
                    animationDuration: `${timings.mouthDur}s`,
                    animationDelay: `${timings.mouthDelay}s`,
                  }}
                >
                  {resolved.mouthFamily === 'toon' && (
                    // Pink lip rim — thicker salmon stroke behind the mouth
                    // creates the signature toon "lipped" mouth opening.
                    // Drawn UNDER the actual mouth path so it reads as a
                    // ring around the black cavity.
                    <path
                      className="mouthLip"
                      fill="none"
                      stroke="#ff6b88"
                      strokeWidth={28}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      d={mouthPathFor(resolved.mouthFamily, effectiveMouth)}
                    />
                  )}
                  <path
                    className="mouthPath"
                    fill="#0a0a0a"
                    stroke={faceInk.ink}
                    strokeWidth={6}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    d={mouthPathFor(resolved.mouthFamily, effectiveMouth)}
                  />
                  <g className="teeth">
                    <Teeth mouth={effectiveMouth} family={resolved.mouthFamily} />
                  </g>
                  <path
                    className="tongue"
                    fill="#ff4d6d"
                    stroke={faceInk.ink}
                    strokeWidth={5}
                    d={tonguePath(resolved.mouthFamily, effectiveMouth)}
                  />
                </g>
                <g className="beard" aria-hidden>
                  <Beard family={resolved.beardFamily} />
                </g>
              </svg>
            </div>
          </div>
        </div>
        </FaceInkContext.Provider>
      </div>
      {!compact && (
        <div
          className="text-center text-[10px] sm:text-[11px] tracking-widest truncate px-1"
          title={status ? `${name} — ${status}` : name}
        >
          <span className="font-display">{name}</span>
          {status && (
            <span className="opacity-70 italic tracking-normal normal-case"> — {status}</span>
          )}
        </div>
      )}
    </div>
  );
}

export const Face = memo(FaceImpl);
