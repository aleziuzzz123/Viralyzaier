export const config = { runtime: 'edge' };

// IMPORTANT: no "v" prefix, and keep the trailing slash.
const BASE = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function contentType(p: string) {
  const ext = p.split('.').pop()?.toLowerCase();
  if (ext === 'wasm') return 'application/wasm';
  if (ext === 'css') return 'text/css; charset=utf-8';
  if (ext === 'js' || ext === 'mjs') return 'application/javascript; charset=utf-8';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'json') return 'application/json; charset=utf-8';
  return undefined;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  // forward everything after /api/cesdk-assets/ to the CDN base
  const path = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  if (!path) return new Response('Missing asset path.', { status: 400, headers: cors });

  try {
    const target = new URL(path, BASE); // safe join against /cesdk-js/1.57.0/
    const upstream = await fetch(target.toString(), {
      headers: { 'User-Agent': 'viralyzer-cesdk-proxy' }
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      return new Response(`Upstream ${upstream.status}: ${body}`, { status: upstream.status, headers: cors });
    }

    const buf = await upstream.arrayBuffer();
    const headers = new Headers(cors);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Content-Type', contentType(path) || upstream.headers.get('Content-Type') || 'application/octet-stream');

    return new Response(buf, { status: 200, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
};

