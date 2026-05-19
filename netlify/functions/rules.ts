import { buildRulesBody, RULES_VERSION } from '../../src/shared/rules';

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const origin = url.origin;
  const wantsJson = url.pathname.endsWith('.json');

  const body = buildRulesBody(origin);

  if (wantsJson) {
    return new Response(
      JSON.stringify({ version: RULES_VERSION, body }, null, 2),
      {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=300',
          'access-control-allow-origin': '*',
        },
      },
    );
  }

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'access-control-allow-origin': '*',
      'x-mugsprite-rules-version': String(RULES_VERSION),
    },
  });
};
