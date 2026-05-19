import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useRoomStream } from '../lib/useRoomStream';
import { DESPAWN_AFTER_MIN, Face } from '../components/Face';

// Big-screen view of a room. No header, no footer, no chrome — just the
// faces, sized for couch-distance viewing. Designed for:
//  - tab-mirroring / screen-mirroring (Chromecast, AirPlay, Miracast)
//  - the Presentation API (CastButton on RoomPage hands off this URL)
//  - second-display dashboards
//
// Same SSE stream as the regular room — no extra backend code needed. We do
// NOT show owner controls, sponsor badges, or audio toggles here; the TV view
// is read-only.

const HIDE_CURSOR_MS = 3000;

export default function TvPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { state, acknowledgeSpeech } = useRoomStream(roomId);

  const agentList = useMemo(() => Object.values(state.agents), [state.agents]);

  // Drop despawned agents (matches AgentGrid behavior). Re-evaluates on a
  // 30s tick so the TV view doesn't keep ghosts on screen.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const visible = useMemo(() => {
    void tick;
    const cutoff = Date.now() - DESPAWN_AFTER_MIN * 60_000;
    return agentList.filter((a) => !a.leftAt && new Date(a.updatedAt).getTime() > cutoff);
  }, [agentList, tick]);

  // Hide the cursor after a few seconds of mouse stillness, so a TV/projector
  // doesn't show a stuck cursor at the bottom-right.
  const [cursorVisible, setCursorVisible] = useState(true);
  useEffect(() => {
    let timer: number | undefined;
    const reset = () => {
      setCursorVisible(true);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setCursorVisible(false), HIDE_CURSOR_MS);
    };
    reset();
    window.addEventListener('mousemove', reset);
    return () => {
      window.removeEventListener('mousemove', reset);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!roomId) return null;

  return (
    <>
      <Helmet>
        <title>Mugsprite TV — {roomId}</title>
        <meta name="robots" content="noindex,nofollow" />
        {/* Force a dark theme on TV. body color is set via class on body. */}
        <html className="bg-ink" />
        <body className="bg-ink text-paper" />
      </Helmet>
      <div
        className="fixed inset-0 bg-ink text-paper p-6 md:p-10 overflow-hidden flex flex-col"
        style={{ cursor: cursorVisible ? 'auto' : 'none' }}
      >
        <header className="flex items-center justify-between text-paper/60 font-display tracking-widest text-xs mb-4 shrink-0">
          <span>MUGSPRITE</span>
          <span className="opacity-60">ROOM {roomId.toUpperCase()}</span>
        </header>
        <div className="flex-1 min-h-0">
          {visible.length === 0 ? (
            <EmptyTv />
          ) : (
            <TvGrid visible={visible} onSpeechEnd={acknowledgeSpeech} />
          )}
        </div>
      </div>
    </>
  );
}

function EmptyTv() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="font-display tracking-widest text-3xl md:text-5xl text-paper/30">
          WAITING FOR AGENTS
        </div>
        <div className="text-sm md:text-base text-paper/40">
          Anyone joining this room will appear here.
        </div>
      </div>
    </div>
  );
}

// TV-scale grid. Uses CSS grid with auto-fit and a generous min cell size so
// faces are large enough to read from a couch. The min cell size scales with
// viewport via clamp() — small on a phone-cast, huge on a 65" TV.
function TvGrid({
  visible,
  onSpeechEnd,
}: {
  visible: Array<{
    id: string;
    name: string;
    color: string;
    mood: import('@shared/types').Mood;
    status: string | null;
    updatedAt: string;
    speakingText?: string | null;
  }>;
  onSpeechEnd: (id: string) => void;
}) {
  // For 1-4 agents, fixed columns to keep them big. For 5+ use auto-fit with
  // a large min cell so faces don't shrink below readability.
  const cols =
    visible.length <= 1
      ? 'grid-cols-1'
      : visible.length <= 4
        ? 'grid-cols-2'
        : visible.length <= 9
          ? 'grid-cols-3'
          : 'grid-cols-4';
  return (
    <div className={`grid gap-4 md:gap-8 w-full h-full ${cols}`}>
      {visible.map((agent) => (
        <div key={agent.id} className="min-h-0 min-w-0 flex items-center justify-center">
          <Face
            mood={agent.mood}
            color={agent.color}
            name={agent.name}
            status={agent.status}
            updatedAt={agent.updatedAt}
            speakingText={agent.speakingText ?? null}
            onSpeechEnd={() => onSpeechEnd(agent.id)}
            muted={true}
            volume={1}
          />
        </div>
      ))}
    </div>
  );
}
