// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' }; // Fast + works on Vercel edge

const VERSION = '1.57.0'; // keep in sync with your CE.SDK version
const CDN_ROOT = `https://cdn.img.ly/packages/imgly/cesdk-js/${VERSION}/assets/`;

const typeByExt = (p: string) => {
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (p.endsWith('.wasm')) return 'application/wasm';
  if (p.endsWith('.data')) return 'application/octet-stream';
  if (p.endsWith('.woff2')) return 'font/woff2';
  if (p.endsWith('.woff')) return 'font/woff';
  if (p.endsWith('.ttf')) return 'font/ttf';
  return undefined;
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  // everything after /api/cesdk-assets/
  const after = url.pathname.split('/api/cesdk-assets/')[1] || '';
  if (!after) return new Response('Missing path', { status: 400 });

  const upstream = CDN_ROOT + after.replace(/^\/+/, '');
  const upstreamResp = await fetch(upstream, {
    // Pass through ETag/If-None-Match automatically
    headers: { 'Accept': req.headers.get('Accept') ?? '*/*' },
  });

  if (!upstreamResp.ok) {
    return new Response(upstreamResp.statusText, { status: upstreamResp.status });
  }

  const ct = typeByExt(after) ?? upstreamResp.headers.get('content-type') ?? 'application/octet-stream';
  const cache =
    after.endsWith('.wasm') || after.endsWith('.data') || after.endsWith('.woff2') || after.endsWith('.css') || after.endsWith('.js')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=86400';

  return new Response(upstreamResp.body, {
    status: 200,
    headers: {
      'Content-Type': ct,
      'Cache-Control': cache,
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
