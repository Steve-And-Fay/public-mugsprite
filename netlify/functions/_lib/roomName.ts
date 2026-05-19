import { z } from 'zod';

// Schema and normalizer for owner-driven room renames. Lives in its own
// module so the pure helpers can be unit-tested without dragging in the DB
// or HTTP layers that rooms.ts depends on.

export const PATCH_ROOM_NAME_MAX = 64;

export const PatchRoomBody = z.object({
  // Empty string is allowed because it's the wire signal to clear the name.
  // The handler trims first; a null/blank/whitespace value normalizes to null.
  name: z.string().max(PATCH_ROOM_NAME_MAX).nullable(),
});

export type PatchRoomBodyInput = z.infer<typeof PatchRoomBody>;

/**
 * Normalize a user-supplied display name to what we'd store in the DB.
 *
 *  - `null` stays `null`.
 *  - Strings are trimmed of surrounding whitespace.
 *  - Empty (or whitespace-only) strings collapse to `null` so the UI can
 *    fall back to displaying the room id.
 *
 * Length is capped by the Zod schema before this runs; passing a too-long
 * string here returns the trimmed value as-is (callers are expected to
 * validate first).
 */
export function normalizeRoomName(input: string | null): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  return trimmed === '' ? null : trimmed;
}
