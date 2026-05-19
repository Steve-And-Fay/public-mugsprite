import { neon } from '@netlify/neon';
import { createHash } from 'node:crypto';

const sql = neon();

export interface RateLimitConfig {
  // Maximum tokens the bucket can hold (also the burst size).
  capacity: number;
  // Refill rate in tokens per second. e.g. 1 = 1 token/sec sustained.
  refillPerSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  // Seconds the caller should wait before the next attempt has a real chance
  // of succeeding (i.e. when the bucket will have >= 1 token). 0 if allowed.
  retryAfterSec: number;
}

// Bucket presets. Tune by editing here; callers reference the named bucket.
export const RATE_BUCKETS = {
  // High-volume MCP tool calls. 1/sec sustained with a 60-call burst means
  // an agent can hammer briefly during a sync but a runaway loop is capped.
  mcp_call: { capacity: 60, refillPerSec: 1 },
  // Renewal: tight. 5 per hour means humans/agents can recover from a
  // mistake but can't farm extensions in a loop.
  renew: { capacity: 5, refillPerSec: 5 / 3600 },
  // Room creation per IP. 10/hour. Loose enough for testing, tight enough
  // that a single IP can't fill the table.
  create_room: { capacity: 10, refillPerSec: 10 / 3600 },
} satisfies Record<string, RateLimitConfig>;

export type BucketName = keyof typeof RATE_BUCKETS;

export function hashIdentifier(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// Atomic token-bucket consume against Postgres. One round-trip per call.
// Returns the post-consume state so callers can set Retry-After headers and
// log telemetry without a follow-up SELECT.
export async function consumeRate(
  identifier: string,
  bucket: BucketName,
): Promise<RateLimitResult> {
  const { capacity, refillPerSec } = RATE_BUCKETS[bucket];
  const tokenHash = hashIdentifier(identifier);

  // Refill math: new_tokens = min(capacity, tokens + elapsed_seconds * refillPerSec)
  // Then subtract 1. The UPDATE only fires when the refilled bucket has >=1
  // token (gated by WHERE), so denied calls don't reset refilled_at — the
  // bucket keeps accumulating naturally. The `consumed` discriminator tells
  // us whether the row came from the upsert (allowed) or the fallback SELECT
  // against the un-updated row (denied).
  const rows = (await sql`
    WITH upsert AS (
      INSERT INTO rate_limits (token_hash, bucket, tokens, refilled_at)
      VALUES (${tokenHash}, ${bucket}, ${capacity - 1}, NOW())
      ON CONFLICT (token_hash, bucket) DO UPDATE
        SET tokens = LEAST(
              ${capacity}::double precision,
              rate_limits.tokens
                + EXTRACT(EPOCH FROM (NOW() - rate_limits.refilled_at)) * ${refillPerSec}
            ) - 1,
            refilled_at = NOW()
        WHERE LEAST(
                ${capacity}::double precision,
                rate_limits.tokens
                  + EXTRACT(EPOCH FROM (NOW() - rate_limits.refilled_at)) * ${refillPerSec}
              ) >= 1
      RETURNING tokens, true AS consumed
    )
    SELECT tokens, consumed FROM upsert
    UNION ALL
    SELECT
      LEAST(
        ${capacity}::double precision,
        tokens + EXTRACT(EPOCH FROM (NOW() - refilled_at)) * ${refillPerSec}
      ) AS tokens,
      false AS consumed
    FROM rate_limits
    WHERE token_hash = ${tokenHash} AND bucket = ${bucket}
      AND NOT EXISTS (SELECT 1 FROM upsert)
    LIMIT 1
  `) as { tokens: number; consumed: boolean }[];

  const row = rows[0];
  const allowed = row?.consumed === true;
  const currentTokens = row?.tokens ?? capacity - 1;
  const tokensNeeded = Math.max(0, 1 - currentTokens);
  const retryAfterSec =
    allowed || refillPerSec <= 0 ? 0 : Math.ceil(tokensNeeded / refillPerSec);

  return {
    allowed,
    remaining: Math.max(0, Math.floor(currentTokens)),
    retryAfterSec,
  };
}
