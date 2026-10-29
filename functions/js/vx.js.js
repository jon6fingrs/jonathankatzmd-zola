// GET /js/vx.js: the Plausible script, served first-party under a name ad
// blockers don't match (see [extra.plausible] in config.toml).

export async function onRequestGet({ env }) {
  const upstream = await fetch(`https://${env.PLAUSIBLE_HOST}${env.PLAUSIBLE_SCRIPT || '/js/script.js'}`, {
    cf: { cacheEverything: true, cacheTtl: 3600 },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
