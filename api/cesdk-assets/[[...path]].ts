// api/cesdk-assets/[...path].ts
export const config = { runtime: 'edge' };

const BASE = 'https://cdn.img.ly/packages/imgly/cesdk-engine/v1.57.0/';

// CORS + basic headers
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Date, ETag',
};

export default async function handler(req: Request) {
  try {
    // strip the /api/cesdk-assets/ prefix and guard against traversal
    const url = new URL(req.url);
    const relative = url.pathname.replace('/api/cesdk-assets/', '');
    if (!relative || relative.includes('..')) {
      return new Response('Bad path', { status: 400, headers: cors });
    }

    // Build final CDN URL
    const target = new URL(BASE + relative);

    // Fetch from IMG.LY CDN
    const upstream = await fetch(target.toString(), {
      headers: { 'User-Agent': 'viralyzer-cesdk-proxy' }
    });

    // Return the body as ArrayBuffer so wasm works
    const body = await upstream.arrayBuffer();

    // Copy headers and force correct content types + long cache
    const headers = new Headers(cors);
    upstream.headers.forEach((v, k) => headers.set(k, v));

    if (relative.endsWith('.wasm')) headers.set('Content-Type', 'application/wasm');
    if (relative.endsWith('.css'))  headers.set('Content-Type', 'text/css; charset=utf-8');
    if (relative.endsWith('.data') || relative.endsWith('.bin')) {
      headers.set('Content-Type', 'application/octet-stream');
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(body, { status: upstream.status, headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'proxy failed' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
}
