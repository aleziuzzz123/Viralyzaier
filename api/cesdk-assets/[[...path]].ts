// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

// Point to the CE.SDK asset CDN root (adjust if needed).
// Using a generic path so the function doesn't 404 if versions change.
const CDN_ROOT = 'https://cdn.img.ly/cesdk';

const guessType = (p: string) => {
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (p.endsWith('.wasm')) return 'application/wasm';
  if (p.endsWith('.data')) return 'application/octet-stream';
  if (p.endsWith('.woff2')) return 'font/woff2';
  if (p.endsWith('.woff')) return 'font/woff';
  if (p.endsWith('.ttf')) return 'font/ttf';
  return 'application/octet-stream';
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const subPath = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  if (!subPath) {
    return new Response('Missing asset path', { status: 400 });
  }
  const remoteUrl = `${CDN_ROOT}/${subPath}`;
  const upstream = await fetch(remoteUrl, { redirect: 'follow' });
  if (!upstream.ok || !upstream.body) {
    return new Response(`Upstream ${upstream.status} for ${remoteUrl}`, { status: upstream.status || 502 });
  }
  const type = upstream.headers.get('content-type') ?? guessType(subPath);
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*'
    }
  });
}