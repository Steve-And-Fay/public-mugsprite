import { ZodError, type ZodSchema } from 'zod';

export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const ok = (body: unknown) => json(200, body);
export const created = (body: unknown) => json(201, body);
export const noContent = () => new Response(null, { status: 204 });

export const badRequest = (message: string, details?: unknown) =>
  json(400, { error: 'bad_request', message, details });
export const unauthorized = (message = 'unauthorized') =>
  json(401, { error: 'unauthorized', message });
export const forbidden = (message = 'forbidden') => json(403, { error: 'forbidden', message });
export const notFound = (message = 'not_found') => json(404, { error: 'not_found', message });
export const methodNotAllowed = (allowed: string[]) =>
  new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'content-type': 'application/json', allow: allowed.join(', ') },
  });
export const conflict = (message: string) => json(409, { error: 'conflict', message });
export const serverError = (message = 'internal_error') =>
  json(500, { error: 'internal_error', message });

export function parseBearer(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]!.trim() : null;
}

export async function readJson<T>(req: Request, schema: ZodSchema<T>): Promise<T | Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('invalid JSON body');
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) return badRequest('validation failed', err.flatten());
    throw err;
  }
}

export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
