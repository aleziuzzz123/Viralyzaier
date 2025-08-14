// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

// CDN roots for the two packages
const CDN_JS      = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0';
const CDN_ENGINE  = 'https://cdn.img.ly/packages/imgly/cesdk-engine/v1.57.0';

// Very permissive CORS for static assets
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Date, ETag',
};

export default async function handler(req: Request) {
  // Strip the /api/cesdk-assets/ prefix
  const relative = new URL(req.url).pathname.replace(/^\/api\/cesdk-assets\//, '');

  // Map UI vs engine assets
  const upstream = relative.startsWith('core/')
    ? `${CDN_ENGINE}/${relative.replace(/^core\//, '')}`
    : `${CDN_JS}/assets/${relative}`;

  const headers = new Headers(CORS);
  // long cache for immutable versioned files
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  try {
    const res = await fetch(upstream, {
      // Important: pass-through the GET cleanly
      method: 'GET',
      headers: { 'User-Agent': 'viralyzer-cesdk-proxy' },
    });

    if (!res.ok) {
      return new Response(`NOT_FOUND\n${upstream}`, {
        status: 404,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const ct = res.headers.get('Content-Type') || '';
    headers.set('Content-Type', ct);

    // Stream the bytes (works for wasm/data/css/js)
    return new Response(res.body, { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'proxy failed', upstream, message: err?.message }), {
      status: 502,
      headers: { ...Object.fromEntries(CORS_ENTRIES(headers)), 'Content-Type': 'application/json' },
    });
  }
}

function CORS_ENTRIES(h: Headers): [string, string][] {
  return [['Access-Control-Allow-Origin', h.get('Access-Control-Allow-Origin')!],
          ['Access-Control-Expose-Headers', h.get('Access-Control-Expose-Headers')!]];
}
