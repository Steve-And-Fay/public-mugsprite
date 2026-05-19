#!/usr/bin/env node
// Apply db/schema.sql against NETLIFY_DATABASE_URL using the neon HTTP driver.
// Idempotent — every statement uses IF NOT EXISTS so re-running is safe.
//
// Usage:
//   netlify dev exec node scripts/apply-schema.mjs    (preferred — Netlify injects the URL)
//   NETLIFY_DATABASE_URL=postgres://... node scripts/apply-schema.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { neon } from '@netlify/neon';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, '..', 'db', 'schema.sql');

if (!process.env.NETLIFY_DATABASE_URL) {
  console.error(
    'NETLIFY_DATABASE_URL is not set. Either:\n' +
      '  • run via `netlify dev exec node scripts/apply-schema.mjs`, or\n' +
      '  • run `netlify env:get NETLIFY_DATABASE_URL` and export it manually.',
  );
  process.exit(1);
}

const sql = neon(process.env.NETLIFY_DATABASE_URL);
const schema = readFileSync(schemaPath, 'utf8');

// Strip line/block comments, then split on `;` at end-of-statement.
const cleaned = schema
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*--.*$/gm, '');
const statements = cleaned
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} statement(s) from db/schema.sql…`);

for (const [i, stmt] of statements.entries()) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
  process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}… `);
  try {
    await sql.query(stmt);
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    console.error(err);
    process.exit(1);
  }
}

console.log('Schema applied.');
