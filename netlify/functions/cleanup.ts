import { neon } from '@netlify/neon';

// Scheduled cleanup: enforces the 24-hour-post-expiration deletion promised in
// the Privacy Policy. Rooms live 7 days from creation, then have a 24h
// housekeeping grace window before deletion. Total max retention: 8 days.
//
// Agents and events cascade via ON DELETE CASCADE on the rooms FK.
//
// Runs daily via the schedule below.
export const config = {
  schedule: '@daily',
};

const sql = neon();

export default async (): Promise<Response> => {
  const cutoffIso = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const rows = (await sql`
      DELETE FROM rooms
      WHERE created_at < ${cutoffIso}::timestamptz
      RETURNING id
    `) as Array<{ id: string }>;

    // Also prune any orphaned events older than 30 days (defensive — they
    // should cascade with rooms, but stale rows can accumulate if the FK ever
    // gets relaxed in a future migration).
    const eventCutoffIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const orphans = (await sql`
      DELETE FROM events
      WHERE created_at < ${eventCutoffIso}::timestamptz
      RETURNING id
    `) as Array<{ id: string }>;

    // Prune stale rate-limit rows. Buckets refill on every use; rows untouched
    // for 30 days correspond to identifiers (IPs / token hashes) that have been
    // idle long enough that the bucket would be fully refilled anyway —
    // recreating the row on next use costs one insert. The table is created in
    // schema.sql; gate defensively in case cleanup runs before migrations.
    let rateLimitsPruned = 0;
    try {
      const rl = (await sql`
        DELETE FROM rate_limits
        WHERE refilled_at < NOW() - interval '30 days'
        RETURNING token_hash
      `) as Array<{ token_hash: string }>;
      rateLimitsPruned = rl.length;
    } catch (err) {
      // 42P01 = undefined_table. Safe to ignore on a DB that hasn't migrated yet.
      const code = (err as { code?: string } | null)?.code;
      if (code !== '42P01') throw err;
    }

    const summary = {
      kind: 'mugsprite_cleanup',
      at: new Date().toISOString(),
      rooms_deleted: rows.length,
      events_pruned: orphans.length,
      rate_limits_pruned: rateLimitsPruned,
      cutoff: cutoffIso,
    };
    console.log(JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('cleanup failed', err);
    return new Response('cleanup failed', { status: 500 });
  }
};
