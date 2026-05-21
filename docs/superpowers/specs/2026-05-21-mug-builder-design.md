# Mug Builder — Design

**Date:** 2026-05-21
**Status:** Draft, awaiting approval
**Goal:** Let room owners customize each agent's persistent visual identity — eyes, mouth, and color — through a dashboard builder, so the 12 mood expressions render as cohesive variations of *their* chosen character instead of the shared built-in face.

## Goals

- Give owners a low-friction way to make every agent look distinct without authoring 12 animations themselves.
- Guarantee cohesion: changing a trait propagates across all 12 moods automatically.
- Ship inside one focused branch in roughly five working days.
- Reuse the existing parametric `Face`/`FaceParts` renderer — no new asset formats, no uploads, no extra runtime dependencies.
- Preserve current visual behavior for any agent that has not been customized (full backward compatibility).

## Non-goals (v1)

- Face shape, brow customization, persistent accessories (horns/ears/hat), and pattern overlays. Deferred to v1.1+.
- Custom asset uploads (sprite sheets, GIFs, Lottie, animated SVG). Deferred to a future "pro mode" escape hatch.
- AI-assisted character generation.
- Per-room default packs. v1 is per-agent only; agents without customization fall back to the built-in face.
- Site-wide dark/light theming. Out of scope for this branch. The character-color WCAG contrast flip (cream linework on dark personality colors) is already handled by `inkForBackground` and needs no additional work.

## Approach

**Core idea:** the existing mood table tightly couples each mood to a complete `{eyes, brows, mouth}` triple. We separate **persistent character traits** (set by the owner in the builder) from **mood overrides** (declared by each mood as a delta over the base). The renderer composes them at draw time.

```
Character traits (owner-chosen, persistent across all 12 moods)
  ├─ baseEyes:  EyeStyle    (one of 11)
  ├─ baseMouth: MouthStyle  (one of 8 curated base mouths)
  └─ color:     string      (already per-agent today)

Mood delta (declared per mood, overrides base when the mood is emotionally expressive)
  ├─ eyes?:  EyeStyle   (e.g. sleepy → closed, error → x)
  ├─ mouth?: MouthStyle (e.g. sad → frown, surprised → openO)
  └─ brows:  BrowStyle  (stays mood-driven in v1 — not in the builder)
```

The rendered face for `(traits, mood)` is:

```ts
const eyes   = MOOD_DELTAS[mood].eyes   ?? traits.baseEyes;
const mouth  = MOOD_DELTAS[mood].mouth  ?? traits.baseMouth;
const brows  = MOOD_DELTAS[mood].brows;        // brows always mood-driven in v1
const accessory = ACCESSORIES[mood];            // mood reactions unchanged
```

A `null`/missing `traits` row falls back to today's `MOODS` table verbatim, guaranteeing backward compatibility.

### Which moods override eyes vs. mouth (canonical delta table)

Decided up front so the spec is unambiguous and the refactor is mechanical, not interpretive. Derived from the current `MOODS` table — anything that today differs from `idle`'s `{normal, gentleSmile}` becomes a delta.

| Mood       | eyes override   | mouth override |
|------------|-----------------|----------------|
| idle       | —               | —              |
| happy      | `happy`         | `bigSmile`     |
| excited    | `sparkle`       | `bigSmile`     |
| silly      | `cross`         | `tongueOut`    |
| singing    | `happy`         | `singO`        |
| surprised  | `wide`          | `openO`        |
| thinking   | `lookUp`        | `smirk`        |
| confused   | `asymm`         | `wavy`         |
| sleepy     | `closed`        | `tinyO`        |
| sad        | `sad`           | `frown`        |
| angry      | `narrow`        | `flat`         |
| error      | `x`             | `flat`         |

The only mood with no eye or mouth override is `idle`. For an idle agent, the renderer shows the owner's base eyes and base mouth exactly as picked in the builder.

### Curated base-mouth set

The full `MouthStyle` enum has 16 entries, but six are `talk_*` lipsync poses that should never appear as a resting state. Two more (`tongueOut`, `singO`) are too expressive to feel right as a default. The builder offers these eight as base mouths:

```
gentleSmile, bigSmile, frown, openO, tinyO, flat, smirk, wavy
```

The remaining mouths stay internal to the renderer (lipsync) and to mood deltas (`tongueOut` for silly, `singO` for singing).

### Combinatorics

11 eyes × 8 base mouths × free-form color = **88 distinct character silhouettes**, each available in any color the owner picks. With ~16 sensible palette presets that's ~1,400 visually distinct mugs.

## Schema (additions to `db/schema.sql`)

```sql
-- Persistent visual traits per agent. NULL = uncustomized, render the
-- built-in face exactly as today.
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS traits JSONB;

-- No index needed; this column is read alongside the agent row in normal
-- room queries and is never filtered on.
```

Traits JSON shape (validated server-side via Zod):

```json
{
  "v": 1,
  "baseEyes": "normal",
  "baseMouth": "gentleSmile"
}
```

`color` lives in its own existing column. The `v` field gates future migrations (e.g., when we add `baseShape`).

A missing `traits` field, an unknown enum value, or a failed Zod parse silently falls back to the built-in face for that agent. The DB write path rejects bad payloads with HTTP 400; the read path is lenient so a single corrupted row never breaks the dashboard.

## File layout

```
src/
  shared/
    moods.ts                       (modified — add MOOD_DELTAS + AgentTraits type + Zod schema)
  components/
    Face.tsx                       (modified — consume traits)
    OwnerPanel.tsx                 (modified — new "Customize" link per agent row)
    MugBuilder.tsx                 (new — the builder UI)
    MugBuilder.preview.tsx         (new — 12-mood preview grid)
  pages/
    Room.tsx                       (modified — route handling for ?builder=<agent_id>)
netlify/
  functions/
    agents.ts                      (modified — PATCH endpoint accepts traits)
docs/superpowers/specs/
  2026-05-21-mug-builder-design.md (this file)
db/
  schema.sql                       (modified — ALTER TABLE)
```

No new top-level dependencies.

## Renderer changes (`Face.tsx`, `FaceParts.tsx`)

`FaceImpl` gains an optional `traits?: AgentTraits | null` prop. Inside the component:

```ts
const moodDef = MOODS[mood];             // unchanged — still drives brows + accessories
const delta = MOOD_DELTAS[mood];          // new
const eyes  = delta.eyes  ?? traits?.baseEyes  ?? moodDef.eyes;
const mouth = delta.mouth ?? traits?.baseMouth ?? moodDef.mouth;
```

`Eye`, `Brows`, `Teeth`, `mouthPaths` — **no changes**. They already accept a style string and render accordingly.

The talking mouth cycle (`isTalking && talkMouth`) still wins over everything — speaking always uses lipsync poses, regardless of base or delta.

## Builder UI (`MugBuilder.tsx`)

Reached via `/r/:roomId?builder=<agent_id>` (a query-param route to avoid a router refactor). The builder mounts as a modal overlay on the Room page — same page shell and SSE connection as the dashboard. Owner-token auth is the same gate that already protects the OwnerPanel; the builder reuses that check and is launched from a per-agent "Customize" button in the OwnerPanel.

Layout:

```
┌─────────────────────────────────────────────────────────┐
│  Customize SCOUT                              [Save][×] │
├──────────────────────────────┬──────────────────────────┤
│  Eyes                        │  Preview                 │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐        │  ┌──┐┌──┐┌──┐┌──┐        │
│  │● ││● ││● ││● ││● │ ...    │  │  ││  ││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘        │  └──┘└──┘└──┘└──┘        │
│  normal happy sad ...        │   idle happy excited ... │
│                              │                          │
│  Mouth                       │  ┌──┐┌──┐┌──┐┌──┐        │
│  ┌──┐┌──┐┌──┐┌──┐            │  │  ││  ││  ││  │        │
│  │  ││  ││  ││  │ ...        │  └──┘└──┘└──┘└──┘        │
│  └──┘└──┘└──┘└──┘            │   silly singing ...      │
│  gentle big frown ...        │                          │
│                              │  ┌──┐┌──┐┌──┐┌──┐        │
│  Color                       │  │  ││  ││  ││  │        │
│  [native <input type=color>] │  └──┘└──┘└──┘└──┘        │
│  Hex: [#5599DD]              │                          │
└──────────────────────────────┴──────────────────────────┘
```

- Picker tiles are mini `Face` renders showing the current character locked to a representative mood — `normal` eye tile shows the eye in `idle`, `closed` shows it in `sleepy`, etc. — so the owner sees the style in its natural context.
- Mouth tiles similarly.
- Color picker is the browser-native `<input type="color">` plus a hex field. No palette presets in v1 — the WCAG luminance flip handles every color.
- Preview pane shows all 12 moods as small live `Face` components with the current selection applied. They animate (breath, blink, mood reactions) just like in the room.
- "Save" → PATCH `/api/agents/:id` with `{ traits }` → SSE pushes the updated agent → all viewers see the change in real time. The builder pane stays open so the owner can keep iterating.
- "×" / Cancel closes the builder without saving. If unsaved changes exist, confirm-dismiss.
- Reset-to-default button (clears traits, agent renders built-in face again).

## API surface

```
PATCH /api/agents/:id
  Authorization: Bearer <owner_token>
  Body: { traits: AgentTraits | null }
  Response: 200 { agent } | 400 invalid traits | 401 | 404
```

`null` body clears the customization. SSE event `agent.updated` already exists; this reuses it with the new `traits` field included in the agent payload.

## SSE / wire format

Adds one optional field to the existing agent payload pushed over SSE:

```json
{ "type": "agent.updated", "agent": { "id": "...", "traits": { ... } | null, "..." } }
```

Older dashboard clients that don't know about `traits` simply ignore the unknown field — no breaking change.

## OwnerPanel integration

Each agent row in the existing OwnerPanel gets a small "Customize" link beside the existing delete/rename controls. Clicking sets the `?builder=<agent_id>` query param. The Room page reads the param and mounts `MugBuilder` as an overlay above the grid.

## Validation rules

Server-side Zod schema:

```ts
const TraitsSchema = z.object({
  v: z.literal(1),
  baseEyes: z.enum(EYE_STYLES),   // imported from moods.ts
  baseMouth: z.enum(BASE_MOUTHS), // the curated 8
});
```

`BASE_MOUTHS` is a new exported tuple in `moods.ts`, narrower than the full `MouthStyle` union. Picking a non-base mouth via the API is a 400.

## Backward compatibility & rollout

- The schema change is additive — no migration of existing rows, all start with `traits = NULL`.
- Renderer falls back to today's behavior when `traits` is null or invalid.
- SSE payload adds an optional field; old clients ignore it.
- No env var or feature flag — the feature is live the moment the branch ships.

## Testing

Unit:

- `MOOD_DELTAS` lookup matches today's `MOODS` table verbatim when traits are null (parity test — renders all 12 moods, snapshot against current output).
- Zod schema accepts every (eye, mouth) combination from the curated sets, rejects out-of-range, rejects unknown `v`.
- Composition rule: for each mood × each base eye × each base mouth, the computed `(eyes, mouth)` equals delta-or-base.

Component:

- Builder renders all picker tiles and all 12 preview tiles without runtime errors.
- Selecting a tile updates preview in under one frame (no async).
- Save calls PATCH with the right body; cancel discards.
- Reset clears traits.

Integration:

- Customize an agent → reload room → traits persist.
- Two viewers on the same room → save in viewer A → viewer B's grid updates via SSE.

Manual / `npm run verify`:

- Typecheck, lint, and tests pass.
- Visual spot-check of every mood for both an uncustomized agent (built-in face) and a customized one (button eyes + smirk + #5599DD), plus a very dark color (#0a0a0a) and a very light color (#fffaeb) to confirm the WCAG ink flip still reads.

## Out of scope, deferred, or explicitly cut

- Brow customization (still mood-driven in v1).
- Face shape, persistent accessories, patterns — v1.1+.
- Per-room default packs.
- Custom asset uploads (sprite sheets, Lottie, GIFs).
- AI character assist.
- Builder-side accessibility audit beyond keyboard navigation and label hookup.
- Mobile builder UX. Builder is desktop-first like the rest of the dashboard.

## Open question

None blocking. The earlier "should agents be able to set their own traits via MCP" question is resolved: **owner-only via dashboard in v1**. Agents pick moods; owners pick character. This keeps the agent contract simple and prevents an agent from cosmetically impersonating another.

## Definition of Done

A room owner can: open OwnerPanel → click "Customize" on an agent → pick base eyes from 11 options → pick base mouth from 8 options → pick any hex color → see all 12 moods animate live in the preview grid → click Save → the change propagates over SSE to every dashboard viewer of the room. Reload the room and the customization persists. Click Reset and the agent renders the original built-in face. `npm run verify` is clean.
