// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

// Make sure the version matches your package import
const CDN_BASE = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0';

function contentType(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'wasm': return 'application/wasm';
    case 'css':  return 'text/css; charset=utf-8';
    case 'js':
    case 'mjs':  return 'application/javascript; charset=utf-8';
    case 'svg':  return 'image/svg+xml';
    case 'json': return 'application/json; charset=utf-8';
    case 'data': return 'application/octet-stream';
    case 'woff': return 'font/woff';
    case 'woff2':return 'font/woff2';
    default:     return undefined;
  }
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  // Everything after /api/cesdk-assets is mirrored on the CDN
  const subpath = url.pathname.replace(/^\/api\/cesdk-assets/, '') || '/';
  const target = `${CDN_BASE}${subpath}`;

  const upstream = await fetch(target, { headers: { 'User-Agent': 'viralyzer-cesdk-proxy' } });
  if (!upstream.ok) return new Response(`Upstream ${upstream.status}`, { status: upstream.status });

  const buf = await upstream.arrayBuffer();
  const headers = new Headers(upstream.headers);
  const ct = contentType(subpath);
  if (ct) headers.set('Content-Type', ct);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.delete('content-encoding');

  return new Response(buf, { status: 200, headers });
}
