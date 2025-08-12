// api/cesdk-assets/[[...path]].ts
export const config = { runtime: 'edge' };

const ENGINE_BASE = 'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0/';
const JS_BASE     = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function pickUpstream(rawPath: string) {
  let p = rawPath.replace(/^\/+/, '');

  // The CSS lives in /styles/, not /stylesheets/. Normalize if needed.
  p = p.replace(/^stylesheets\//, 'styles/');

  // Engine bits come from the cesdk-engine package.
  if (
    p.startsWith('core/') ||
    p.startsWith('engine/') ||
    p.endsWith('.wasm') ||
    p.endsWith('.data') ||
    p.endsWith('engine_worker.js')
  ) {
    return new URL(p, ENGINE_BASE);
  }

  // Everything UI-ish (styles, fonts, icons, images for UI) from cesdk-js.
  return new URL(p, JS_BASE);
}

function contentType(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'wasm': return 'application/wasm';
    case 'data': return 'application/octet-stream';
    case 'css':  return 'text/css; charset=utf-8';
    case 'js':
    case 'mjs':  return 'application/javascript; charset=utf-8';
    case 'svg':  return 'image/svg+xml';
    case 'json': return 'application/json; charset=utf-8';
    case 'woff2':return 'font/woff2';
    case 'woff': return 'font/woff';
    case 'ttf':  return 'font/ttf';
    default:     return undefined;
  }
}

export default async function handler(req: Request) {
  const url  = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/cesdk-assets\/?/, '');

  if (!path) {
    return new Response('Missing asset path.', { status: 400, headers: cors });
  }

  try {
    const target = pickUpstream(path);
    const upstream = await fetch(target.toString(), {
      headers: { 'User-Agent': 'viralyzer-cesdk-proxy' }
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      return new Response(`Upstream ${upstream.status}: ${txt}`, {
        status: upstream.status,
        headers: cors
      });
    }

    const buf = await upstream.arrayBuffer();
    const headers = new Headers(cors);

    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    const ct = contentType(path) || upstream.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);

    return new Response(buf, { status: 200, headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Proxy internal error: ${err?.message || err}` }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
}

