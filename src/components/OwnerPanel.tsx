import { useEffect, useRef, useState } from 'react';
import type { Agent } from '@shared/types';
import { api } from '../lib/api';
import { generateAgentName } from '@shared/ids';
import { buildRulesBody } from '@shared/rules';

interface OwnerPanelProps {
  roomId: string;
  ownerToken: string;
  agentJoinToken: string;
  agents: Agent[];
  origin: string;
  expiresAt: string | null;
  onRenewed: (expiresAt: string) => void;
}

function formatExpiry(iso: string): string {
  const t = new Date(iso).getTime();
  const ms = t - Date.now();
  if (ms <= 0) return 'EXPIRED';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const stamp = new Date(t).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (days >= 1) return `in ${days}d ${hours}h · ${stamp}`;
  if (hours >= 1) return `in ${hours}h · ${stamp}`;
  const mins = Math.max(1, Math.floor(ms / 60000));
  return `in ${mins}m · ${stamp}`;
}

const DEFAULT_COLORS = [
  '#5599DD',
  '#33CC66',
  '#FF8833',
  '#9966CC',
  '#FF66CC',
  '#33CCCC',
  '#E63946',
  '#FFCC33',
];

const CLIENT_IDS = [
  'claude-code',
  'claude-desktop',
  'cursor',
  'vscode',
  'codex',
  'openclaw',
  'other',
] as const;

type ClientId = (typeof CLIENT_IDS)[number];

const CLIENT_LABELS: Record<ClientId, string> = {
  'claude-code': 'CLAUDE CODE (CLI)',
  'claude-desktop': 'CLAUDE DESKTOP',
  cursor: 'CURSOR',
  vscode: 'VS CODE',
  codex: 'CODEX / CHATGPT',
  openclaw: 'OPENCLAW',
  other: 'OTHER',
};

interface ClientInstall {
  snippet: string;
  where: string;
  after: string;
}

function jsonBlock(origin: string, token: string, key: 'mcpServers' | 'servers'): string {
  return JSON.stringify(
    {
      [key]: {
        mugsprite: {
          type: 'http',
          url: `${origin}/mcp`,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );
}

function clientInstall(client: ClientId, origin: string, token: string): ClientInstall {
  switch (client) {
    case 'claude-code': {
      const serverObj = JSON.stringify({
        type: 'http',
        url: `${origin}/mcp`,
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        snippet: `claude mcp add-json mugsprite -s user '${serverObj}'`,
        where: 'Run this in any shell. User scope = works from any project.',
        after: 'Type /exit, then claude to restart the session.',
      };
    }
    case 'claude-desktop':
      return {
        snippet: jsonBlock(origin, token, 'mcpServers'),
        where:
          'Merge into ~/Library/Application Support/Claude/claude_desktop_config.json (macOS) or %APPDATA%\\Claude\\claude_desktop_config.json (Windows).',
        after: 'Quit and reopen Claude Desktop.',
      };
    case 'cursor':
      return {
        snippet: jsonBlock(origin, token, 'mcpServers'),
        where:
          'Merge into ~/.cursor/mcp.json (global) or .cursor/mcp.json (this project). Or use Settings → MCP → Add.',
        after: 'Reload the Cursor window (Cmd/Ctrl+Shift+P → "Reload Window").',
      };
    case 'vscode':
      return {
        snippet: jsonBlock(origin, token, 'servers'),
        where:
          'Save as .vscode/mcp.json in your workspace (or merge into the User Settings "mcp" block). Note: VS Code uses "servers", not "mcpServers".',
        after: 'Reload the VS Code window, then enable the server when prompted.',
      };
    case 'codex':
      return {
        snippet: `[mcp_servers.mugsprite]
type = "http"
url = "${origin}/mcp"
headers = { Authorization = "Bearer ${token}" }`,
        where:
          'Codex CLI: append to ~/.codex/config.toml (TOML format). ChatGPT (consumer) does not support MCP yet — use Codex CLI or a Custom GPT with Actions.',
        after: 'Restart the codex CLI session.',
      };
    case 'openclaw': {
      const serverObj = JSON.stringify({
        transport: 'streamable-http',
        url: `${origin}/mcp`,
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        snippet: `openclaw mcp set mugsprite '${serverObj}'`,
        where:
          'Run this in any shell. Persists to OpenClaw\'s saved MCP config (see https://docs.openclaw.ai/cli/mcp).',
        after: 'Restart the OpenClaw session so the new server is picked up at launch.',
      };
    }
    case 'other':
      return {
        snippet: jsonBlock(origin, token, 'mcpServers'),
        where:
          'Generic JSON. Find where your client stores its MCP servers and merge this in.',
        after: 'Restart the client.',
      };
  }
}

type CopyKind = 'install' | 'system';

// The canonical rules body lives in src/shared/rules.ts so the /rules endpoint,
// the MCP server's `latest_rules` tool, and this UI all serve the same text.
function systemPromptSnippet(origin: string): string {
  return buildRulesBody(origin);
}

interface InstallPanelProps {
  // Optional — the install snippet is now the same for every agent in the
  // room, so the shared "view install" button doesn't have a specific agent
  // to attach. When omitted, the header just shows the headline.
  agent?: Agent;
  token: string;
  origin: string;
  onDismiss: () => void;
  headline: string;
}

function InstallPanel({ agent, token, origin, onDismiss, headline }: InstallPanelProps) {
  const [copied, setCopied] = useState<CopyKind | null>(null);
  // When clipboard.writeText is unavailable or blocked (insecure context,
  // permission denied, document not focused), we surface a readonly textarea
  // pre-selected so the user can ⌘C / Ctrl+C manually.
  const [copyFailed, setCopyFailed] = useState<CopyKind | null>(null);
  const [client, setClient] = useState<ClientId>('claude-code');

  // Esc closes; lock background scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onDismiss]);

  const handleCopy = async (which: CopyKind, text: string) => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setCopyFailed((f) => (f === which ? null : f));
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 1800);
    } catch {
      // Clipboard API blocked — show the fallback textarea below the snippet.
      setCopyFailed(which);
    }
  };

  const install = clientInstall(client, origin, token);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <section className="bg-ink text-paper border-[3px] border-ink rounded-none sm:rounded-2xl shadow-brutal w-full sm:max-w-3xl max-h-screen sm:max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between gap-2 p-4 border-b border-paper/20 shrink-0">
          <h2
            id="install-modal-title"
            className="font-display text-sm sm:text-base tracking-widest text-accent-pink truncate"
          >
            ▸ {agent ? `${agent.name} — ${headline}` : headline}
          </h2>
          <button
            onClick={onDismiss}
            className="font-display text-lg leading-none border-2 border-paper/60 rounded px-2 py-0.5 hover:bg-paper hover:text-ink shrink-0"
            aria-label="Close install panel"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto p-4 space-y-4">
          <div>
            <div className="font-display text-[10px] tracking-widest opacity-80 mb-2">
              1. PICK YOUR CLIENT
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CLIENT_IDS.map((id) => {
                const active = id === client;
                return (
                  <button
                    key={id}
                    onClick={() => setClient(id)}
                    className={`font-display text-[10px] tracking-wider border-2 rounded px-2.5 py-1.5 ${
                      active
                        ? 'bg-accent-pink text-ink border-paper'
                        : 'bg-transparent text-paper border-paper/40 hover:border-paper'
                    }`}
                    aria-pressed={active}
                  >
                    {CLIENT_LABELS[id]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-display text-[10px] tracking-widest opacity-80">
                2. INSTALL ({CLIENT_LABELS[client]})
              </span>
              <button
                onClick={() => handleCopy('install', install.snippet)}
                className="bg-accent-green text-ink border-2 border-paper rounded px-2 py-0.5 font-display text-[10px] tracking-wider"
              >
                {copied === 'install' ? '✓ COPIED' : 'COPY'}
              </button>
            </div>
            <p className="text-[11px] opacity-80 mb-1">{install.where}</p>
            <pre className="text-[11px] bg-black/40 p-3 rounded overflow-x-auto whitespace-pre-wrap leading-snug">
              {install.snippet}
            </pre>
            {copyFailed === 'install' && (
              <CopyFallback text={install.snippet} maxRows={10} />
            )}
            <p className="text-[10px] opacity-60 mt-1">{install.after}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-display text-[10px] tracking-widest opacity-80">
                3. RULES (PASTE INTO USER-LEVEL RULES — NOT A PROJECT FILE)
              </span>
              <button
                onClick={() => handleCopy('system', systemPromptSnippet(origin))}
                className="bg-accent-pink text-ink border-2 border-paper rounded px-2 py-0.5 font-display text-[10px] tracking-wider"
              >
                {copied === 'system' ? '✓ COPIED' : 'COPY'}
              </button>
            </div>
            <pre className="text-[11px] bg-black/40 p-3 rounded overflow-x-auto whitespace-pre-wrap leading-snug max-h-[40vh]">
              {systemPromptSnippet(origin)}
            </pre>
            {copyFailed === 'system' && (
              <CopyFallback text={systemPromptSnippet(origin)} maxRows={12} />
            )}
            <p className="text-[10px] opacity-60 mt-1">
              Paste into your USER-level rules (~/.claude/CLAUDE.md, Cursor global
              rules, ~/.codex/AGENTS.md). The agent picks a per-project persona on
              first run and writes it into the project's own rules file. The
              version stamp lets the agent auto-detect when these rules update.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function OwnerPanel({
  roomId,
  ownerToken,
  agentJoinToken,
  agents,
  origin,
  expiresAt,
  onRenewed,
}: OwnerPanelProps) {
  const [name, setName] = useState(() => generateAgentName());
  const [color, setColor] = useState(DEFAULT_COLORS[0]!);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [install, setInstall] = useState<{
    agent?: Agent;
    token: string;
    headline: string;
  } | null>(null);
  const [renewing, setRenewing] = useState(false);

  const handleRenew = async () => {
    setRenewing(true);
    try {
      const result = await api.renewRoom(roomId, ownerToken);
      onRenewed(result.expiresAt);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to renew room');
    } finally {
      setRenewing(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const result = await api.createAgent(roomId, name.trim(), color, ownerToken);
      setInstall({
        agent: result.agent,
        token: agentJoinToken,
        headline: 'drop into your agent',
      });
      setName(generateAgentName());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add agent');
    } finally {
      setCreating(false);
    }
  };

  // One install snippet covers every agent in the room — it just contains
  // the room bearer token. The per-agent INSTALL button used to exist when
  // tokens were per-agent; with the shared-bearer model we surface this once
  // at the section header instead.
  const handleShowInstall = () => {
    setInstall({
      token: agentJoinToken,
      headline: 'install snippet',
    });
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Remove this agent from the grid? They can re-register with the room bearer at any time.')) return;
    try {
      await api.deleteAgent(agentId, ownerToken);
      setInstall((cur) => (cur && cur.agent?.id === agentId ? null : cur));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove agent');
    }
  };

  return (
    <div className="space-y-3">
      {expiresAt && (
        <section className="bg-paper border-[3px] border-ink rounded-2xl p-3 sm:p-4 shadow-brutal">
          <h2 className="font-display text-[10px] sm:text-xs tracking-widest mb-2">
            ▸ Room lifetime
          </h2>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] opacity-70">Expires</div>
              <div className="font-display text-xs sm:text-sm truncate" title={new Date(expiresAt).toISOString()}>
                {formatExpiry(expiresAt)}
              </div>
            </div>
            <button
              onClick={handleRenew}
              disabled={renewing}
              className="shrink-0 bg-accent-green border-[2.5px] border-ink rounded-lg px-3 py-2 font-display text-xs tracking-wider shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50"
            >
              {renewing ? 'RENEWING…' : '+7 DAYS'}
            </button>
          </div>
        </section>
      )}

      <section className="bg-paper border-[3px] border-ink rounded-2xl p-3 sm:p-4 shadow-brutal">
        <h2 className="font-display text-[10px] sm:text-xs tracking-widest mb-2 sm:mb-3">
          ▸ Add agent
        </h2>
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Agent name (e.g. grumpy-axolotl-42)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={32}
              className="flex-1 min-w-0 border-[2.5px] border-ink rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:bg-yellow-50"
            />
            <button
              type="button"
              onClick={() => setName(generateAgentName())}
              title="Generate a new name"
              aria-label="Generate a new name"
              className="shrink-0 bg-accent-cyan border-[2.5px] border-ink rounded-lg px-3 py-2 font-display text-sm shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
            >
              🎲
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded border-2 border-ink shadow-brutal-sm transition-transform ${
                  color === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full bg-accent-pink border-[2.5px] border-ink rounded-lg px-3 py-2 font-display text-xs tracking-wider shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition disabled:opacity-50"
          >
            {creating ? 'CREATING…' : '+ ADD AGENT'}
          </button>
          {error && <p className="text-red-700 text-xs">{error}</p>}
        </form>
      </section>

      {install && (
        <InstallPanel
          agent={install.agent}
          token={install.token}
          origin={origin}
          headline={install.headline}
          onDismiss={() => setInstall(null)}
        />
      )}

      <section className="bg-paper border-[3px] border-ink rounded-2xl p-3 sm:p-4 shadow-brutal">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <h2 className="font-display text-[10px] sm:text-xs tracking-widest">
            ▸ Active agents ({agents.length})
          </h2>
          <button
            onClick={handleShowInstall}
            className="bg-accent-cyan border-2 border-ink rounded px-2.5 py-0.5 font-display text-[10px] tracking-wider shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
            aria-label="View install snippet for this room"
          >
            INSTALL
          </button>
        </div>

        {agents.length === 0 ? (
          <p className="text-xs opacity-60">No agents yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {agents.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 border-2 border-ink rounded-lg px-2 py-1.5 bg-paper shadow-brutal-sm"
              >
                <span
                  className="w-4 h-4 rounded border-2 border-ink shrink-0"
                  style={{ backgroundColor: a.color }}
                />
                <span className="font-display text-[11px] tracking-wider flex-1 truncate">
                  {a.name}
                </span>
                <span className="text-[10px] opacity-60 hidden sm:inline">{a.mood}</span>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="font-display text-xs hover:text-red-700"
                  aria-label={`Remove ${a.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Manual-copy fallback. Rendered when navigator.clipboard.writeText is
// unavailable or refuses (insecure context, focus rules, permission denied,
// sandboxed iframe). On mount the textarea selects its full contents so the
// user just needs to press ⌘C / Ctrl+C.
function CopyFallback({ text, maxRows = 8 }: { text: string; maxRows?: number }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    try {
      ta.select();
    } catch {
      /* selection may be blocked in rare environments — ignore */
    }
  }, []);
  return (
    <div className="mt-2 border border-accent-yellow/40 bg-accent-yellow/10 rounded p-2">
      <p className="text-[10px] text-accent-yellow font-display tracking-widest mb-1">
        ⚠ AUTO-COPY BLOCKED — SELECT BELOW AND PRESS ⌘C / CTRL+C
      </p>
      <textarea
        ref={ref}
        readOnly
        value={text}
        rows={Math.min(maxRows, Math.max(2, text.split('\n').length))}
        className="w-full text-[11px] bg-black/40 p-2 rounded font-mono leading-snug resize-y"
        onFocus={(e) => e.target.select()}
        aria-label="Copy this text manually"
      />
    </div>
  );
}
