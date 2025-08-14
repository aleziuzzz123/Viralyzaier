// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

// CE.SDK CDN base (locked to the version in package.json)
const CDN_BASE = 'https://cdn.img.ly/packages/cesdk-js/1.57.0/';
const PREFIX = '/api/cesdk-assets/';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const i = url.pathname.indexOf(PREFIX);
  const rest = i >= 0 ? url.pathname.slice(i + PREFIX.length) : '';

  // Build the upstream URL by appending the requested path to the CDN base
  const upstreamUrl = new URL(rest, CDN_BASE).toString();

  const upstream = await fetch(upstreamUrl, {
    // Follow redirects from the CDN and forward basic headers
    redirect: 'follow',
    headers: { 'User-Agent': req.headers.get('user-agent') ?? 'viralyzaier-proxy' }
  });

  // Stream back the body and preserve useful headers
  const hdr = new Headers();
  hdr.set('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream');
  hdr.set('Cache-Control', upstream.headers.get('cache-control') ?? 'public, max-age=31536000, immutable');
  hdr.set('Cross-Origin-Resource-Policy', 'cross-origin');

  return new Response(upstream.body, { status: upstream.status, headers: hdr });
}
