// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const UI_BASE     = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets/';
const ENGINE_BASE = 'https://cdn.img.ly/packages/imgly/cesdk-engine/v1.57.0/';

// Turn the incoming /api/cesdk-assets/... path into the right upstream URL
function upstreamUrlFor(relative: string): string {
  // UI assets (css, fonts, images) live under the cesdk-js "assets/" folder
  if (relative.startsWith('ui/')) {
    return new URL(relative, UI_BASE).toString();
  }
  // Engine core (wasm, data, worker, etc.) live under the cesdk-engine folder
  return new URL(relative, ENGINE_BASE).toString();
}

export default async function handler(req: Request): Promise<Response> {
  // Extract the part after /api/cesdk-assets/
  const url = new URL(req.url);
  const relative = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');

  if (!relative) {
    return new Response('Missing path', { status: 400 });
  }

  const upstreamUrl = upstreamUrlFor(relative);

  try {
    const upstream = await fetch(upstreamUrl, {
      // a UA helps IMG.LY support diagnose if needed
      headers: { 'User-Agent': 'viralyzaier-cesdk-proxy' },
      // GET is fine for static assets; pass-through other methods if you ever need to
    });

    // Copy headers and make them CORS + cache friendly
    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Date, ETag');
    // Long cache for immutable versioned assets
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Proxy failed', message: String(err?.message || err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
