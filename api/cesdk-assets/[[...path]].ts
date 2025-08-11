// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

// Add trailing slash for safe URL joining.
const BASE = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function contentType(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'wasm') return 'application/wasm';
  if (ext === 'css') return 'text/css; charset=utf-8';
  if (ext === 'js' || ext === 'mjs') return 'application/javascript; charset=utf-8';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'json') return 'application/json; charset=utf-8';
  return undefined;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  
  if (!path) {
    return new Response('Missing asset path.', { status: 400, headers: corsHeaders });
  }
  
  try {
    const targetUrl = new URL(path, BASE);
    const upstream = await fetch(targetUrl.toString(), { headers: { 'User-Agent': 'viralyzer-cesdk-proxy' } });
    
    if (!upstream.ok) {
        const errorText = await upstream.text();
        return new Response(`Upstream fetch failed: ${upstream.status} - ${errorText}`, { status: upstream.status, headers: corsHeaders });
    }

    const buf = await upstream.arrayBuffer();
    const headers = new Headers(corsHeaders);

    const ct = contentType(path) || upstream.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);

    if (upstream.headers.has('Content-Length')) {
        headers.set('Content-Length', upstream.headers.get('Content-Length')!);
    }
    
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(buf, { status: 200, headers });
    
  } catch (error) {
    // This will catch the `new URL()` error if it occurs.
    return new Response(JSON.stringify({ error: `Proxy internal error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}