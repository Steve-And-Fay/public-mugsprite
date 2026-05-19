import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Agent } from '@shared/types';
import { Face } from './Face';

// Document Picture-in-Picture: pops the agent grid out into a small,
// chromeless, always-on-top browser window. Chrome / Edge 116+ only.
// Firefox / Safari fall through and the button doesn't render.
//
// Implementation: we ask the browser for a PiP Window, copy our document's
// stylesheets across so Tailwind classes still resolve, then React-portal a
// stripped-down face grid into that window's body. Live agent state flows
// through the portal just like any other React subtree.

interface DocumentPictureInPicture {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

type PipAgent = Agent & { speakingText?: string | null };

interface PipButtonProps {
  agents: PipAgent[];
  onSpeechEnd: (id: string) => void;
  muted?: boolean;
  volume?: number;
  className?: string;
}

export function PipButton({ agents, onSpeechEnd, muted, volume, className }: PipButtonProps) {
  const [supported, setSupported] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && typeof window.documentPictureInPicture !== 'undefined');
  }, []);

  // Close the PiP window when this component unmounts (e.g. on navigation).
  useEffect(() => {
    return () => {
      pipWindow?.close();
    };
  }, [pipWindow]);

  const open = async () => {
    const dpip = window.documentPictureInPicture;
    if (!dpip) return;
    try {
      const win = await dpip.requestWindow({ width: 380, height: 380 });
      // Copy every stylesheet from the host document so Tailwind / our
      // custom CSS resolves inside the PiP window. Same-origin rules let us
      // serialize cssRules; cross-origin sheets fall back to a <link>.
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join('\n');
          const style = win.document.createElement('style');
          style.textContent = rules;
          win.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = win.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            win.document.head.appendChild(link);
          }
        }
      }
      win.document.title = 'Mugsprite';
      win.document.documentElement.classList.add('bg-ink');
      win.document.body.classList.add('bg-ink', 'text-paper');
      win.addEventListener('pagehide', () => setPipWindow(null));
      setPipWindow(win);
    } catch {
      // User dismissed the prompt, or the browser refused. No-op.
    }
  };

  const close = () => {
    pipWindow?.close();
    setPipWindow(null);
  };

  if (!supported) return null;

  const isOpen = pipWindow !== null;
  return (
    <>
      <button
        type="button"
        onClick={isOpen ? close : open}
        className={className}
        aria-label={isOpen ? 'Close picture-in-picture' : 'Open picture-in-picture'}
        aria-pressed={isOpen}
      >
        <span aria-hidden="true">⤢</span> {isOpen ? 'EXIT PIP' : 'PIP'}
      </button>
      {pipWindow &&
        createPortal(
          <PipView agents={agents} onSpeechEnd={onSpeechEnd} muted={muted} volume={volume} />,
          pipWindow.document.body,
        )}
    </>
  );
}

function PipView({
  agents,
  onSpeechEnd,
  muted,
  volume,
}: {
  agents: PipAgent[];
  onSpeechEnd: (id: string) => void;
  muted?: boolean;
  volume?: number;
}) {
  const visible = agents.filter((a) => !a.leftAt);
  const cols =
    visible.length <= 1
      ? 'grid-cols-1'
      : visible.length <= 4
        ? 'grid-cols-2'
        : 'grid-cols-3';
  return (
    <div className="fixed inset-0 bg-ink text-paper p-3 overflow-hidden">
      {visible.length === 0 ? (
        <div className="h-full flex items-center justify-center font-display text-[10px] tracking-widest text-paper/40 text-center">
          NO AGENTS YET
        </div>
      ) : (
        <div className={`grid gap-2 w-full h-full ${cols}`}>
          {visible.map((a) => (
            <div key={a.id} className="min-h-0 min-w-0 flex items-center justify-center">
              <Face
                mood={a.mood}
                color={a.color}
                name={a.name}
                status={a.status}
                updatedAt={a.updatedAt}
                speakingText={a.speakingText ?? null}
                onSpeechEnd={() => onSpeechEnd(a.id)}
                muted={muted ?? true}
                volume={volume ?? 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
