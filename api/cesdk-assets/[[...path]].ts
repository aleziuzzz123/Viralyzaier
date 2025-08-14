// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const VERSION = 'v1.57.0';
const CDN_BASE = `https://cdn.img.ly/packages/imgly/cesdk/${VERSION}`;

function addCors(h: Headers) {
  const out = new Headers(h);
  out.set('access-control-allow-origin', '*');
  out.set('access-control-allow-methods', 'GET,OPTIONS');
  out.set('access-control-allow-headers', '*,authorization,content-type');
  if (!out.has('cache-control')) {
    out.set('cache-control', 'public, max-age=31536000, immutable');
  }
  return out;
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: addCors(new Headers()) });
  }
  const url = new URL(req.url);
  const rel = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  if (!rel) {
    return new Response('OK', { status: 200, headers: addCors(new Headers({'content-type':'text/plain'})) });
  }
  const upstream = await fetch(`${CDN_BASE}/${rel}`, { headers: { 'accept-encoding': 'gzip' } });
  return new Response(upstream.body, { status: upstream.status, headers: addCors(upstream.headers) });
}
