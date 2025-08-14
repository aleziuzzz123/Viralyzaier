// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const UI_BASE =
  'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/';       // CSS, fonts, themes
const CORE_BASE =
  'https://cdn.img.ly/packages/imgly/cesdk-engine/latest/';    // wasm/data/js for the engine

function joinURL(base: string, parts: string[]) {
  const b = base.endsWith('/') ? base : base + '/';
  return b + parts.join('/');
}

function contentTypeFromExt(path: string) {
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js'))  return 'application/javascript; charset=utf-8';
  if (path.endsWith('.wasm'))return 'application/wasm';
  if (path.endsWith('.data'))return 'application/octet-stream';
  if (path.endsWith('.woff2'))return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  return undefined;
}

export default async function handler(req: Request) {
  // Next pages/api (Edge) exposes the pathname on req.url
  const url = new URL(req.url);
  // Everything after /api/cesdk-assets/
  const segments = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    return new Response('Missing asset path', { status: 400 });
  }

  // First segment selects the package we proxy to
  const [pkg, ...rest] = segments;

  let upstream: string | null = null;
  if (pkg === 'ui') {
    // /api/cesdk-assets/ui/stylesheets/cesdk.css  -> cesdk-ui/latest/stylesheets/cesdk.css
    upstream = joinURL(UI_BASE, rest);
  } else if (pkg === 'core') {
    // /api/cesdk-assets/core/cesdk-v1.57.0-XXXX.wasm -> cesdk-engine/latest/cesdk-v1.57.0-XXXX.wasm
    upstream = joinURL(CORE_BASE, rest);
  } else {
    // Backwards/unknown: if a request arrives without the prefix, assume core
    upstream = joinURL(CORE_BASE, [pkg, ...rest]);
  }

  const res = await fetch(upstream, {
    // Pass-through method/headers not needed here; a simple GET is enough
    cache: 'no-store',
  });

  if (!res.ok || !res.body) {
    return new Response(`Not found: ${upstream}`, { status: 404 });
  }

  const headers = new Headers(res.headers);
  // Set reliable content-type when CDN is missing it
  const ct = contentTypeFromExt(upstream);
  if (ct) headers.set('content-type', ct);

  // Cache aggressively at the edge/CDN
  headers.set('cache-control', 'public, s-maxage=31536000, immutable');

  // CORS is not strictly necessary (same-origin), but doesn’t hurt:
  headers.set('access-control-allow-origin', '*');

  return new Response(res.body, { status: 200, headers });
}
