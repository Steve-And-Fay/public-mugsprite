# Richer Signals & Timeline (parked)

**Branch:** `feature/richer-signals-timeline`
**Last touched:** 2026-05-21
**Status:** Phase 1 complete on branch; not merged. Phase 2 not started. Paused — pick up when next prioritized.

## What this work is

A v1.1 expansion of the agent-facing surface:

- New MCP tools: `mugsprite.thinking`, `mugsprite.progress`, `mugsprite.error`
- New REST endpoint: `GET /api/rooms/:id/events` (per-agent history with filters)
- Dashboard timeline drawer + dedicated bubble/progress UI (Phase 2)

Full design is in the branch at
`docs/superpowers/specs/2026-05-19-richer-signals-and-timeline-design.md`.

## What's done on the branch

Commit `7c1357f` — backend foundation:

- Schema migration v2: adds `bubble_variant`, `bubble_text`, `progress_value`,
  `progress_label`, `error_code` to `agents` with CHECK constraints.
- Three MCP tools wired end-to-end: zod-validated args, DB writes, event-log
  appends, SSE propagation. `set_mood` now also clears bubble/error overlays.
- `GET /api/rooms/:id/events?agent=&limit=&before=&kind=` — newest-first,
  keyset-paged on event id, capped at 200/page.
- `useRoomStream` reducer handles the new event kinds; `Agent` interface and
  snapshot payload carry the new fields.
- Validation unit tests for the three new tools.
- `npm run verify` passes (typecheck + lint + 42 tests).

## What's left

### Phase 2 — UI (not started)

- Extract a dedicated `Bubble` component with `variant` styling
  (`speak` / `thinking` / `error`).
- Add a `ProgressBar` component to the tile (thin bar under the face).
- Build `TimelineDrawer` — slide-in from the right, per-agent, with
  filter chips, "Load older" paging, and JSON export.
- Wire tile click → drawer open.
- Style review against the existing neo-brutalist visual language.
- E2E coverage (Playwright) for the full agent → dashboard flow.

### Production-readiness items for Phase 1

These are real and need to be addressed before the branch can ship — they
are NOT done on the branch:

- **Apply the migration in production** before the function code goes live.
  New tool calls will 500 if columns don't exist. Run `npm run db:apply`
  against the prod DATABASE_URL.
- **Composite index** on `events(room_id, agent_id, id DESC)` for the new
  history query. Existing index is `(room_id, id DESC)`; current query
  works but scales poorly as event volume grows.
- **Rate limit** the events endpoint. It is currently unauthenticated
  (consistent with other room-read endpoints) and uncapped beyond the
  per-call 200-row limit; a polling client could hammer it.
- **Stale progress cleanup.** Spec calls for `cleanup.ts` to NULL out
  `progress_value` / `progress_label` on agents with no progress event
  in the last 5 minutes. Not implemented.
- **Document the new tools in `llms.txt`.** They appear in `tools/list`
  for MCP clients, but human discovery via `/llms.txt` needs updating.
- **De-duplicate validation schemas.** `mcpArgs.test.ts` re-declares the
  three zod schemas because the originals are inline in `mcp.ts`. Export
  them from `mcp.ts` (or move to `src/shared/mcpArgs.ts`) so the tests
  pin the real shape, not a copy.
- **Behavior-change note for changelog.** `set_mood` now clears
  `bubble_variant`/`bubble_text`/`error_code` server-side. Invisible to
  existing flows (those fields are always NULL today) but it is a new
  contract worth calling out.

### Out of scope on this branch (deferred separately)

- Bidirectional `mugsprite.ask(question)` — needs response routing back
  to the MCP caller; its own design pass.
- Replay scrubber.
- Per-agent statistics panel.
- Markdown export format (JSON is in scope; MD trivial follow-up).

## Picking it back up

1. `git checkout feature/richer-signals-timeline`
2. Re-read `docs/superpowers/specs/2026-05-19-richer-signals-and-timeline-design.md`.
3. Phase 2 (UI) can start without rebasing — Phase 1 changes are backend-only
   and the UI is purely additive. Rebase onto current `main` if it has moved.
4. Address the production-readiness list above before merging Phase 1.
