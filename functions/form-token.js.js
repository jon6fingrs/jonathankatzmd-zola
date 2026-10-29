// GET /form-token.js: a fresh form token, in the shape static/js/contact.js
// parses (token = "...").

import { makeToken } from './_lib/token.js';

export async function onRequestGet({ env }) {
  if (!env.TOKEN_SECRET) return new Response('Not configured', { status: 503 });
  const token = await makeToken(env.TOKEN_SECRET);
  return new Response(`var token = "${token}";\n`, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
