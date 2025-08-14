// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const VERSION = 'v1.57.0';
const CDN_BASE = `https://cdn.img.ly/packages/imgly/cesdk/${VERSION}`;

function okCorsHeaders(h: Headers) {
  const headers = new Headers(h);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET,OPTIONS');
  headers.set('access-control-allow-headers', '*,authorization,content-type');
  // keep upstream content-type; add long cache
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'public, max-age=31536000, immutable');
  }
  return headers;
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: okCorsHeaders(new Headers()) });
  }

  // Vercel passes the optional segments via x-vercel-path-matched or the URL
  const url = new URL(req.url);
  const rel = url.pathname.replace(/^\/api\/cesdk-assets\/?/, ''); // "" or "assets/ui/stylesheets/cesdk.css"
  if (!rel) {
    return new Response('OK', { status: 200, headers: okCorsHeaders(new Headers({'content-type':'text/plain'})) });
  }

  const target = `${CDN_BASE}/${rel}`;
  const upstream = await fetch(target, { headers: { 'accept-encoding': 'gzip' } });
  const headers = okCorsHeaders(upstream.headers);
  return new Response(upstream.body, { status: upstream.status, headers });
}
