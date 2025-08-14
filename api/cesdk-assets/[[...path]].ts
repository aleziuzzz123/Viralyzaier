// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const CDN_JS = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets/';
const CDN_ENGINE = 'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0/';

const CONTENT_TYPES: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.css':  'text/css; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8'
};

function pickTarget(path: string) {
  // Normalize common css shortcuts:
  if (path === 'cesdk.css') return CDN_JS + 'styles/cesdk.css';
  if (path === 'cesdk-themes.css') return CDN_JS + 'styles/cesdk-themes.css';

  // Engine files come in as /core/<filename>; on CDN they are in the engine root
  if (path.startsWith('core/')) return CDN_ENGINE + path.replace(/^core\//, '');

  // Everything else (e.g., styles/*) lives under cesdk-js assets
  return CDN_JS + path;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  if (!path) return new Response('Missing path', { status: 400 });

  const target = pickTarget(path);
  const upstream = await fetch(target, { cache: 'no-store' });

  if (!upstream.ok) {
    console.error(`Upstream fetch failed for target: ${target} (status: ${upstream.status})`);
    return new Response('NOT_FOUND', { status: 404 });
  }

  const headers = new Headers(upstream.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  // Ensure correct type if CDN omits it
  const ext = (path.match(/\.[a-z0-9]+$/i)?.[0] ?? '').toLowerCase();
  if (CONTENT_TYPES[ext] && !headers.has('Content-Type')) {
    headers.set('Content-Type', CONTENT_TYPES[ext]);
  }

  return new Response(upstream.body, { status: 200, headers });
}
