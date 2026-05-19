import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { Room } from '@shared/types';
import { api } from '../lib/api';
import { AgentGrid } from '../components/AgentGrid';
import { ExpiredCard } from '../components/ExpiredCard';
import { MyDataDisclosure } from '../components/MyDataDisclosure';
import { OwnerPanel } from '../components/OwnerPanel';
import { useRoomStream } from '../lib/useRoomStream';

const AUDIO_KEY = 'mugsprite:audio';

interface AudioPrefs {
  muted: boolean;
  volume: number;
}

function loadAudioPrefs(): AudioPrefs {
  if (typeof window === 'undefined') return { muted: true, volume: 1 };
  try {
    const raw = window.localStorage.getItem(AUDIO_KEY);
    if (!raw) return { muted: true, volume: 1 };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      muted: Boolean(parsed.muted),
      volume:
        typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : 1,
    };
  } catch {
    return { muted: true, volume: 1 };
  }
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const ownerToken = searchParams.get('owner');
  const [isOwner, setIsOwner] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [audio, setAudio] = useState<AudioPrefs>(() => loadAudioPrefs());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(AUDIO_KEY, JSON.stringify(audio));
    } catch {
      /* storage blocked */
    }
  }, [audio]);

  const { state, acknowledgeSpeech } = useRoomStream(roomId);

  const refreshRoom = useCallback(() => {
    if (!roomId) return;
    api
      .getRoom(roomId, ownerToken ?? undefined)
      .then((r) => {
        setIsOwner(r.isOwner);
        setRoom(r.room);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Room not found');
      });
  }, [roomId, ownerToken]);

  useEffect(() => {
    refreshRoom();
  }, [refreshRoom]);

  const agentList = useMemo(() => Object.values(state.agents), [state.agents]);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Tick periodically so we re-evaluate room expiration without polling the
  // server. Compares wall clock against the server-provided expires_at (which
  // moves forward on renewal).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const expired = !!room && Date.now() > new Date(room.expiresAt).getTime();

  if (!roomId) return null;

  if (loadError) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl mb-2">ROOM NOT FOUND</h1>
          <p className="opacity-70">{loadError}</p>
        </div>
      </main>
    );
  }

  if (expired) {
    return <ExpiredCard />;
  }

  const effectiveVolume = audio.muted ? 0 : audio.volume;

  const seoTitle = `Room ${roomId} — Mugsprite`;
  const seoDesc = `Live Mugsprite room ${roomId}: watch agents register, change moods, and speak on a shared dashboard.`;
  const canonical =
    typeof window !== 'undefined'
      ? window.location.origin + `/r/${roomId}`
      : `https://mugsprite.com/r/${roomId}`;
  const ogImage =
    typeof window !== 'undefined'
      ? window.location.origin + '/og.svg'
      : 'https://mugsprite.com/og.svg';

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
    <main className="flex-1 p-3 sm:p-4 lg:p-6">
      <div
        className={`mx-auto w-full max-w-[1600px] grid gap-4 lg:gap-6 ${
          isOwner ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-1'
        }`}
      >
        <section className="flex flex-col items-stretch min-w-0 order-1 gap-3">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAudio((a) => ({ ...a, muted: !a.muted }))}
              aria-pressed={audio.muted}
              aria-label={audio.muted ? 'Unmute' : 'Mute'}
              className={`border-[2.5px] border-ink rounded-lg px-3 py-1.5 font-display text-[10px] tracking-widest shadow-brutal-sm ${
                audio.muted ? 'bg-ink text-paper' : 'bg-accent-yellow text-ink'
              }`}
            >
              {audio.muted ? '🔇 MUTED' : '🔊 SOUND'}
            </button>
            <label className="flex items-center gap-2 bg-paper border-[2.5px] border-ink rounded-lg px-3 py-1.5 shadow-brutal-sm">
              <span className="font-display text-[10px] tracking-widest">VOL</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={audio.volume}
                disabled={audio.muted}
                onChange={(e) =>
                  setAudio((a) => ({ ...a, volume: Number(e.target.value) }))
                }
                aria-label="Volume"
                className="w-24 accent-ink disabled:opacity-40"
              />
              <span className="font-display text-[10px] tracking-widest w-8 text-right tabular-nums">
                {Math.round(audio.volume * 100)}
              </span>
            </label>
          </div>
          <div className="flex items-start justify-center">
            <AgentGrid
              agents={agentList}
              onSpeechEnd={acknowledgeSpeech}
              muted={audio.muted}
              volume={effectiveVolume}
              isOwner={isOwner}
            />
          </div>
        </section>

        {isOwner && ownerToken && (
          <>
            {/* Mobile floating toggle */}
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              aria-label="Toggle owner panel"
              className="lg:hidden fixed bottom-4 right-4 z-30 bg-ink text-paper border-[3px] border-ink rounded-full px-4 py-2 font-display text-xs tracking-widest shadow-brutal"
            >
              {panelOpen ? '× CLOSE' : '⚙ OWNER'}
            </button>

            <aside
              className={`
                space-y-3 order-2
                lg:static lg:block lg:bg-transparent lg:p-0 lg:overflow-visible
                ${
                  panelOpen
                    ? 'fixed inset-0 z-20 bg-paper p-4 pt-16 overflow-y-auto'
                    : 'hidden lg:block'
                }
              `}
            >
              <header className="bg-ink text-paper border-[3px] border-ink rounded-2xl p-3 sm:p-4 shadow-brutal">
                <h2 className="font-display text-[10px] sm:text-xs tracking-widest text-accent-yellow">
                  ▸ Room {roomId}
                </h2>
                <p className="text-[10px] sm:text-[11px] mt-1 opacity-80">
                  Share this URL (without <code>?owner=</code>) for read-only viewing.
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(`${origin}/r/${roomId}`)}
                  className="mt-2 bg-accent-cyan text-ink border-2 border-paper rounded px-3 py-1 font-display text-[10px] tracking-wider"
                >
                  COPY VIEW LINK
                </button>
              </header>
              <OwnerPanel
                roomId={roomId}
                ownerToken={ownerToken}
                agentJoinToken={room?.agentJoinToken ?? ''}
                agents={agentList}
                origin={origin}
                expiresAt={room?.expiresAt ?? null}
                onRenewed={(expiresAt) => {
                  setRoom((r) => (r ? { ...r, expiresAt } : r));
                }}
              />
            </aside>
          </>
        )}
      </div>

      {state.status === 'error' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-red-100 border-2 border-red-700 text-red-900 rounded-lg px-4 py-2 text-xs">
          Connection lost. Reload to reconnect.
        </div>
      )}

      {isOwner && ownerToken && (
        <MyDataDisclosure roomId={roomId} ownerToken={ownerToken} />
      )}
    </main>
    </>
  );
}
