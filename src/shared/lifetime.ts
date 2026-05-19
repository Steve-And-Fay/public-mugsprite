// How long a freshly created room stays usable. Past this boundary the MCP
// endpoint refuses tool calls and the dashboard renders the expired card.
// The associated data is retained for an additional 24h before housekeeping
// deletion (see the Privacy Policy).
export const ROOM_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ROOM_LIFETIME_LABEL = '7 days';
