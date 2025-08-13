// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const UI_BASE     = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets/';
const ENGINE_BASE = 'https://cdn.img.ly/packages/imgly/cesdk-engine/v1.57.0/';

function upstreamUrlFor(relative: string): string {
  if (relative.startsWith('ui/')) {
    // e.g. ui/stylesheets/cesdk.css  ->  .../assets/stylesheets/cesdk.css
    const path = relative.slice('ui/'.length);
    return new URL(path, UI_BASE).toString();
  }
  if (relative.startsWith('core/')) {
    // e.g. core/cesdk-v1.57.0-ET3GRITS.wasm  ->  .../v1.57.0/cesdk-v1.57.0-ET3GRITS.wasm
    const path = relative.slice('core/'.length);
    return new URL(path, ENGINE_BASE).toString();
  }
  // Fallback: treat as UI asset
  return new URL(relative, UI_BASE).toString();
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const relative = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');

  if (!relative) {
    return new Response('Missing path', { status: 400 });
  }

  try {
    const upstream = await fetch(upstreamUrlFor(relative), {
      headers: { 'User-Agent': 'viralyzaier-cesdk-proxy' }
    });

    // Copy headers and make them CORS + cache friendly
    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Date, ETag');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Content-Type fallbacks (CDN usually sets these, but just in case)
    if (!headers.get('content-type')) {
      if (relative.endsWith('.wasm')) headers.set('content-type', 'application/wasm');
      else if (relative.endsWith('.css')) headers.set('content-type', 'text/css; charset=utf-8');
      else headers.set('content-type', 'application/octet-stream');
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Proxy failed', message: String(err?.message || err) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

