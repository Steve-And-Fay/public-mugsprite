import { neon } from 'https://esm.sh/@netlify/neon@0.1.0';

// Edge-runtime helper for the rolling daily salt. We cache today's salt in
// module scope so warm containers do at most one Neon query per UTC day. Cold
// containers hit Neon once on the first request — still fast.

let cached: { day: string; salt: string } | null = null;

function todayKey(): string {
  // YYYY-MM-DD in UTC.
  return new Date().toISOString().slice(0, 10);
}

// Generate a candidate salt with the Web Crypto API. 32 bytes → 64 hex chars
// is plenty of entropy for what's essentially a daily HMAC key.
function generateCandidateSalt(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getTodaysSalt(): Promise<string> {
  const today = todayKey();
  if (cached && cached.day === today) return cached.salt;

  const sql = neon();
  const candidate = generateCandidateSalt();
  const inserted = (await sql`
    INSERT INTO analytics_salts (day, salt)
    VALUES (CURRENT_DATE, ${candidate})
    ON CONFLICT (day) DO NOTHING
    RETURNING salt
  `) as Array<{ salt: string }>;
  let salt: string;
  if (inserted[0]) {
    salt = inserted[0].salt;
  } else {
    const existing = (await sql`
      SELECT salt FROM analytics_salts WHERE day = CURRENT_DATE LIMIT 1
    `) as Array<{ salt: string }>;
    salt = existing[0]!.salt;
  }
  cached = { day: today, salt };
  return salt;
}

// SHA-256 hex via Web Crypto. Pure function of (salt, ip, ua).
export async function hashVisitor(salt: string, ip: string, ua: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
