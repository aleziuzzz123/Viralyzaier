// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const CDN_JS = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets/';
const CDN_ENGINE = 'https://cdn.img.ly/packages/imgly/cesdk-engine/v1.57.0/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Date, ETag',
};

function contentType(path: string) {
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.wasm')) return 'application/wasm';
  if (path.endsWith('.data')) return 'application/octet-stream';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

export default async function handler(req: Request) {
  const { pathname } = new URL(req.url);
  // strip the prefix
  const relative = pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  if (!relative) {
    return new Response('Missing asset path', { status: 400, headers: CORS });
  }

  // First segment decides which CDN base to use
  const [first, ...rest] = relative.split('/');
  const base = first === 'core' ? CDN_ENGINE : CDN_JS;
  const remaining = first === 'core' ? rest.join('/') : [first, ...rest].join('/');
  const upstreamUrl = new URL(remaining, base).toString();

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'viralyzer-cesdk-proxy' },
    });

    if (!upstream.ok) {
      // Bubble up proper status so you can see 404/403 from CDN
      return new Response(`Upstream ${upstream.status} for ${upstreamUrl}`, {
        status: upstream.status,
        headers: CORS,
      });
    }

    const body = await upstream.arrayBuffer();
    const headers = new Headers(CORS);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Content-Type', contentType(upstreamUrl));

    return new Response(body, { status: 200, headers });
  } catch (err: any) {
    return new Response(`Proxy error: ${err?.message || String(err)}`, {
      status: 502,
      headers: CORS,
    });
  }
}
