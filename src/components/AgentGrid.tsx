import { useEffect, useMemo, useState } from 'react';
import type { Agent } from '@shared/types';
import { DESPAWN_AFTER_MIN, Face } from './Face';
import { SponsorBadge } from './SponsorBadge';

interface AgentGridProps {
  agents: Array<Agent & { speakingText?: string | null; speakingNonce?: number }>;
  onSpeechEnd: (agentId: string) => void;
  muted?: boolean;
  volume?: number;
  isOwner?: boolean;
  // When provided, each tile renders a Customize button (owner-only) that
  // calls back with the agent id. The page hooks this up to open the builder.
  onCustomize?: (agentId: string) => void;
}

// Responsive grid:
// - 1 agent  → centered single tile, capped at sensible size
// - 2 agents → 2 columns
// - 3-4      → 2 columns
// - 5-9      → 3 columns
// - 10+      → auto-fit, min cell 180px
// All cells stay square (aspect-square on the Face wrapper).
function gridCols(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n <= 4) return 'grid-cols-2';
  if (n <= 9) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
}

// Tick once per 30s — feeds a memo dep so despawn filtering re-evaluates
// against current time without remounting the grid.
function useTick(intervalMs: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

export function AgentGrid({
  agents,
  onSpeechEnd,
  muted = false,
  volume = 1,
  isOwner,
  onCustomize,
}: AgentGridProps) {
  const tick = useTick(30_000);
  // Manual dismissals — stores the `updatedAt` value we hid the agent at, so a
  // fresh update (different updatedAt) automatically un-dismisses them.
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const dismiss = (id: string, updatedAt: string | undefined) =>
    setDismissed((prev) => ({ ...prev, [id]: updatedAt ?? '' }));

  const visible = useMemo(() => {
    const now = Date.now();
    return agents.filter((a) => {
      if (dismissed[a.id] !== undefined && dismissed[a.id] === (a.updatedAt ?? '')) {
        return false;
      }
      if (a.speakingText) return true;
      if (!a.updatedAt) return true;
      const base = new Date(a.updatedAt).getTime();
      if (Number.isNaN(base)) return true;
      return (now - base) / 60_000 < DESPAWN_AFTER_MIN;
    });
    // tick is intentionally a dep — drives re-evaluation against current clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, tick, dismissed]);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[40vh] border-[3px] border-dashed border-ink/20 rounded-2xl gap-6 p-8">
        <p className="font-display text-xs sm:text-sm tracking-widest text-ink/40 text-center">
          {isOwner === false
            ? 'No agents are in this room yet. The room owner will add some.'
            : 'NO AGENTS YET. ADD ONE FROM THE OWNER PANEL.'}
        </p>
        <div className="border-t-2 border-ink/10 pt-6 w-full max-w-md">
          <SponsorBadge slot="empty_state" />
        </div>
      </div>
    );
  }

  if (visible.length === 1) {
    const agent = visible[0]!;
    return (
      <div className="flex items-center justify-center w-full">
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
          <Face
            mood={agent.mood}
            color={agent.color}
            name={agent.name}
            status={agent.status}
            updatedAt={agent.updatedAt}
            speakingText={agent.speakingText ?? null}
            onSpeechEnd={() => onSpeechEnd(agent.id)}
            onDismiss={() => dismiss(agent.id, agent.updatedAt)}
            muted={muted}
            volume={volume}
            traits={agent.traits}
            isOwner={isOwner}
            agentId={agent.id}
            onCustomize={onCustomize}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 sm:gap-4 w-full ${gridCols(visible.length)}`}>
      {visible.map((agent) => (
        <Face
          key={agent.id}
          mood={agent.mood}
          color={agent.color}
          name={agent.name}
          status={agent.status}
          updatedAt={agent.updatedAt}
          speakingText={agent.speakingText ?? null}
          onSpeechEnd={() => onSpeechEnd(agent.id)}
          onDismiss={() => dismiss(agent.id, agent.updatedAt)}
          muted={muted}
          volume={volume}
          traits={agent.traits}
          isOwner={isOwner}
          agentId={agent.id}
          onCustomize={onCustomize}
        />
      ))}
    </div>
  );
}
