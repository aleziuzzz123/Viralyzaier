// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

// IMPORTANT: match the version you import from npm/esm
const CDN_BASE = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0';

function contentType(p: string) {
  const ext = p.split('.').pop()?.toLowerCase();
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
  const inUrl = new URL(req.url);
  // Strip our API prefix to mirror CDN structure
  const suffix = inUrl.pathname.replace(/^\/api\/cesdk-assets/, '') || '/';
  const upstreamUrl = `${CDN_BASE}${suffix}`;

  const upstream = await fetch(upstreamUrl, {
    headers: { 'User-Agent': 'viralyzer-cesdk-proxy' }
  });

  if (!upstream.ok) {
    return new Response(
      `Proxy upstream ${upstream.status} for ${upstreamUrl}`,
      { status: upstream.status }
    );
  }

  const buf = await upstream.arrayBuffer();

  const headers = new Headers(upstream.headers);
  const ct = contentType(suffix);
  if (ct) headers.set('Content-Type', ct);

  // prevent ORB/CORP hiccups and cache aggressively
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.delete('content-encoding'); // avoid double-encoding

  return new Response(buf, { status: 200, headers });
}
