// Edge runtime – no @vercel/node types needed
export const config = { runtime: 'edge' };

const CDN_ROOT = 'https://cdn.img.ly/packages/imgly';

// We forward GET and HEAD to the CDN and mirror important headers.
// This allows streaming (Range) for WASM and lets the UI CSS load.
export default async function handler(req: Request): Promise<Response> {
  // Extract the path after /api/cesdk-assets/
  const url = new URL(req.url);
  const subpath = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  if (!subpath) {
    return new Response('Missing path', { status: 400 });
  }

  // Build upstream target, e.g.
  // - cesdk-ui/1.57.0/stylesheets/cesdk.css
  // - cesdk-engine/latest/core/cesdk-v1.57.0-ET3GRITS.wasm
  const target = `${CDN_ROOT}/${subpath}`;

  // Forward selected headers (Range is crucial for WASM streaming)
  const fwdHeaders: Record<string, string> = {
    Accept: '*/*',
    'User-Agent': req.headers.get('user-agent') || 'cesdk-proxy',
  };
  const range = req.headers.get('range');
  if (range) fwdHeaders['Range'] = range;

  // Pass through the original method (HEAD or GET)
  const upstream = await fetch(target, {
    method: req.method, // 'GET' | 'HEAD'
    headers: fwdHeaders,
    redirect: 'follow',
  });

  // Mirror headers and add sane defaults
  const out = new Headers(upstream.headers);
  // Ensure cross-origin policy is permissive for CDN assets
  out.set('Cross-Origin-Resource-Policy', 'cross-origin');

  // Default cache if CDN doesn't send any (immutable because versioned)
  if (!upstream.headers.get('Cache-Control')) {
    out.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // For HEAD requests return only headers + status
  if (req.method === 'HEAD') {
    return new Response(null, { status: upstream.status, headers: out });
  }

  // Stream body for GET (wasm, css, data, etc.)
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

