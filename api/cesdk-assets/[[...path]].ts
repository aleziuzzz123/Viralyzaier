// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const CDN = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets/';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');
  if (!path) return new Response('Not Found', { status: 404 });

  const target = new URL(path, CDN).toString();
  const upstream = await fetch(target, { cache: 'no-store' });

  if (!upstream.ok) return new Response('NOT_FOUND', { status: 404 });
  const headers = new Headers(upstream.headers);
  headers.set('Access-Control-Allow-Origin', '*'); // safe for static assets
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(upstream.body, { status: 200, headers });
}