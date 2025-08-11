// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

// Pin the CE.SDK version you’re using
const CDN_BASE = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0';

/**
 * Map our nice same-origin URLs to the real CDN URLs.
 * We serve:
 *   /api/cesdk-assets/styles/cesdk.css           -> .../styles/cesdk.css
 *   /api/cesdk-assets/styles/cesdk-themes.css    -> .../styles/cesdk-themes.css
 *   /api/cesdk-assets/assets/**                  -> .../assets/**
 */
function mapToCdn(path: string): string | null {
  if (path.startsWith('/styles/')) return `${CDN_BASE}${path}`;
  if (path.startsWith('/assets/')) return `${CDN_BASE}${path}`;
  // Back-compat shorthands if someone links /cesdk.css or /themes/cesdk-themes.css
  if (path === '/cesdk.css') return `${CDN_BASE}/styles/cesdk.css`;
  if (path === '/themes/cesdk-themes.css') return `${CDN_BASE}/styles/cesdk-themes.css`;
  return null;
}

function contentType(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'wasm':  return 'application/wasm';
    case 'css':   return 'text/css; charset=utf-8';
    case 'js':
    case 'mjs':   return 'application/javascript; charset=utf-8';
    case 'svg':   return 'image/svg+xml';
    case 'json':  return 'application/json; charset=utf-8';
    case 'data':  return 'application/octet-stream';
    default:      return undefined;
  }
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const subpath = url.pathname.replace(/^\/api\/cesdk-assets/, '') || '/';
  const target = mapToCdn(subpath);

  if (!target) {
    return new Response('Not found', { status: 404 });
  }

  const upstream = await fetch(target, {
    // Small UA helps IMG.LY with any analytics/routing; not required.
    headers: { 'User-Agent': 'viralyzer-cesdk-proxy' },
  });

  if (!upstream.ok) {
    return new Response(`Upstream ${upstream.status}`, { status: upstream.status });
  }

  const buf = await upstream.arrayBuffer();
  const headers = new Headers(upstream.headers);

  // Ensure correct MIME and caching, and avoid double encoding
  const ct = contentType(subpath);
  if (ct) headers.set('Content-Type', ct);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.delete('content-encoding');
  // These two help modern browsers avoid ORB weirdness
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return new Response(buf, { status: 200, headers });
}
