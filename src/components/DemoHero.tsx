import { useEffect, useMemo, useRef, useState } from 'react';
import type { Agent, Mood } from '@shared/types';
import { Face } from './Face';

// Self-contained client-side demo for the landing hero. No backend calls; no
// speech. Five fake agents drop in over ~90s, cycle through moods for ~60s,
// then leave one-by-one until a single idle face remains. Loops after a beat.

interface DemoAgentSpec {
  id: string;
  name: string;
  color: string;
  joinAt: number; // seconds from cycle start
  leaveAt: number; // seconds from cycle start (0 = never)
  moodScript: Array<{ at: number; mood: Mood; status: string }>;
}

const STATUSES_BY_MOOD: Partial<Record<Mood, string[]>> = {
  thinking: ['reading useRoomStream', 'scanning the router', 'planning the migration', 'tracing the bug'],
  happy: ['tests green ✓', 'shipped the patch', 'merged cleanly', 'fixed the null check'],
  excited: ['found the issue!', 'first pass works', 'all green!', 'just nailed it'],
  surprised: ['this file is 2000 lines?!', 'oh — that was unexpected', 'huh, that worked'],
  confused: ['tests pass but UI breaks', 'why is this null?', 'unexpected 500', 'lockfile drift'],
  silly: ['humming a little tune', 'making faces at the cache', 'doodling in the margin'],
  singing: ['vibing while compiling', 'tra-la-la-builds', 'whistling through tests'],
  sleepy: ['awaiting next ask', 'idle between turns', 'caffeinating', 'cooling off'],
  angry: ['stuck on a flaky test', 'this regex hates me'],
  sad: ['out of ideas', 'tests still red', 'cannot reproduce'],
  error: ['build failed', 'cannot find module'],
  idle: ['here when you need me', 'ready to help'],
};

// Curated palette — high contrast against paper bg, good neighbors.
const PALETTE = ['#5599DD', '#33CC66', '#FF8833', '#9966CC', '#FF66CC'];
const NAMES = [
  'sage-owl-23',
  'mossy-otter-19',
  'curious-fox-04',
  'lavender-quokka-77',
  'ruby-axolotl-33',
];

function pickStatus(mood: Mood): string {
  const arr = STATUSES_BY_MOOD[mood];
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// Per-agent cycles vary so the grid never moves in lockstep. The first entry
// is what they show within ~0.4s of joining — pick punchy openers, not thinking.
const MOOD_CYCLES: Mood[][] = [
  ['excited', 'thinking', 'happy', 'surprised', 'thinking', 'excited', 'silly', 'happy', 'thinking'],
  ['surprised', 'happy', 'thinking', 'excited', 'confused', 'happy', 'silly', 'thinking', 'excited'],
  ['happy', 'thinking', 'excited', 'silly', 'surprised', 'happy', 'thinking', 'singing', 'excited'],
  ['excited', 'singing', 'thinking', 'happy', 'silly', 'surprised', 'thinking', 'excited', 'happy'],
  ['silly', 'excited', 'thinking', 'happy', 'surprised', 'thinking', 'excited', 'confused', 'happy'],
];

// Build a mood script for a single agent across its active window.
function buildScript(
  active: [number, number],
  cycleIndex: number,
): Array<{ at: number; mood: Mood; status: string }> {
  const [start, end] = active;
  const cycle = MOOD_CYCLES[cycleIndex % MOOD_CYCLES.length]!;
  const out: Array<{ at: number; mood: Mood; status: string }> = [];
  // First mood lands almost immediately so the face doesn't sit on the default.
  let t = start + 0.4;
  let i = 0;
  while (t < end) {
    const mood = cycle[i % cycle.length]!;
    out.push({ at: t, mood, status: pickStatus(mood) });
    // 3.5–6s between mood changes keeps movement constant without feeling frantic.
    t += 3.5 + Math.random() * 2.5;
    i++;
  }
  return out;
}

const CYCLE_SECONDS = 150; // ~2:30 — tighter than the previous 2:45
const REST_SECONDS = 6; // brief pause before the cycle restarts

const SPECS: DemoAgentSpec[] = [
  // Fast-paced opening: 5 agents join in the first 25s so the hero feels alive
  // immediately. They linger together for ~70s, then leave one-by-one over the
  // final minute. The first agent never leaves and settles to idle at the end.
  ...[
    { join: 0, leave: 0 }, // first one stays
    { join: 3, leave: 125 },
    { join: 8, leave: 110 },
    { join: 14, leave: 95 },
    { join: 22, leave: 82 },
  ].map((slot, i) => ({
    id: `demo-${i}`,
    name: NAMES[i]!,
    color: PALETTE[i]!,
    joinAt: slot.join,
    leaveAt: slot.leave,
    moodScript: buildScript(
      [slot.join, slot.leave > 0 ? slot.leave : CYCLE_SECONDS],
      i,
    ),
  })),
];

interface DemoState {
  agents: Record<string, Agent>;
}

function computeStateAt(elapsed: number): DemoState {
  const agents: Record<string, Agent> = {};
  const now = new Date().toISOString();
  for (const spec of SPECS) {
    if (elapsed < spec.joinAt) continue;
    const left = spec.leaveAt > 0 && elapsed >= spec.leaveAt;
    if (left) continue;

    // Find the latest mood entry whose `at` <= elapsed.
    let mood: Mood = 'thinking';
    let status = pickStatusDeterministic(spec.id, mood);
    let latestAt = spec.joinAt;
    for (const entry of spec.moodScript) {
      if (entry.at <= elapsed && entry.at >= latestAt) {
        mood = entry.mood;
        status = entry.status;
        latestAt = entry.at;
      }
    }

    // The last surviving agent settles to idle when others have all left.
    if (spec.leaveAt === 0 && elapsed > 150) {
      mood = 'idle';
      status = 'here when you need me';
    }

    agents[spec.id] = {
      id: spec.id,
      roomId: 'demo',
      name: spec.name,
      color: spec.color,
      mood,
      status,
      leftAt: null,
      lastMessage: null,
      createdAt: now,
      updatedAt: now,
      traits: null,
    };
  }
  return { agents };
}

// Stable-per-agent fallback status so initial render doesn't flicker.
const FALLBACK_STATUS: Record<string, string> = {};
function pickStatusDeterministic(id: string, mood: Mood): string {
  const key = `${id}-${mood}`;
  if (FALLBACK_STATUS[key]) return FALLBACK_STATUS[key];
  const arr = STATUSES_BY_MOOD[mood];
  const value = arr?.[0] ?? '';
  FALLBACK_STATUS[key] = value;
  return value;
}

// Always single-row so the hero never overflows. Each cell is aspect-square
// and capped, so column count drives per-cell width; total height = cell size.
function gridCols(n: number): string {
  switch (n) {
    case 1: return 'grid-cols-1';
    case 2: return 'grid-cols-2';
    case 3: return 'grid-cols-3';
    case 4: return 'grid-cols-4';
    default: return 'grid-cols-5';
  }
}

export function DemoHero() {
  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000;
      if (e > CYCLE_SECONDS + REST_SECONDS) {
        startRef.current = Date.now();
        setElapsed(0);
      } else {
        setElapsed(e);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  const state = useMemo(() => computeStateAt(elapsed), [elapsed]);
  const visible = Object.values(state.agents);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`grid gap-2 sm:gap-3 mx-auto justify-center ${gridCols(visible.length)}`}
      // Width = up to 5 cells of min(40vh,200px) + gaps. Height tracks cell
      // size (aspect-square), so on a tall viewport with 1 agent it's ≤40vh
      // tall; with 5 agents on a wide viewport it's ≤200px tall. Either way
      // it stays well under the 50vh ceiling.
      style={{ maxWidth: 'min(100%, 760px)' }}
    >
      {visible.map((agent) => (
        <div
          key={agent.id}
          className="min-w-0 mx-auto"
          // Smaller cell size so the demo reads as a supporting illustration,
          // not the hero centerpiece. 5-in-a-row ≈ 700px wide / 130px tall.
          style={{ width: 'min(22vh, 130px)', maxWidth: '100%' }}
        >
          <Face
            mood={agent.mood}
            color={agent.color}
            name={agent.name}
            status={agent.status}
            updatedAt={agent.updatedAt}
            speakingText={null}
            onSpeechEnd={() => {}}
            muted
            volume={0}
          />
        </div>
      ))}
    </div>
  );
}
