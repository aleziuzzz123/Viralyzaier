// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const ORIGIN = 'https://cdn.img.ly';
const JS_BASE = `${ORIGIN}/packages/imgly/cesdk-js/1.57.0`;
const ENGINE_BASE = `${ORIGIN}/packages/imgly/cesdk-engine/v1.57.0`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Date, ETag',
};

function contentType(path: string): string {
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.wasm')) return 'application/wasm';
  if (path.endsWith('.data')) return 'application/octet-stream';
  return 'application/octet-stream';
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const relPath = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');

  if (!relPath) {
    return new Response('Bad Request', { status: 400, headers: CORS });
  }

  let cdnURL: string;

  if (relPath.startsWith('core/')) {
    // Engine assets (wasm, data) are in a separate package
    cdnURL = `${ENGINE_BASE}/${relPath.substring('core/'.length)}`;
  } else {
    // All other assets (UI, stylesheets, fonts) are in the JS package under /assets
    cdnURL = `${JS_BASE}/assets/${relPath}`;
  }

  try {
    const upstream = await fetch(cdnURL, {
      headers: { 'User-Agent': 'viralyzer-asset-proxy' },
    });

    if (!upstream.ok) {
        // Forward the error status from the CDN
        return new Response(upstream.body, { status: upstream.status, headers: CORS });
    }

    const body = await upstream.arrayBuffer();

    const extraCache = /\.(wasm|data|mjs|js|css)$/.test(cdnURL)
      ? { 'Cache-Control': 'public, max-age=31536000, immutable' }
      : {};

    const headers = {
      ...CORS,
      ...extraCache,
      'Content-Type': upstream.headers.get('Content-Type') || contentType(cdnURL),
      'Content-Length': body.byteLength.toString(),
    };

    return new Response(body, { status: 200, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'proxy failed' }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}