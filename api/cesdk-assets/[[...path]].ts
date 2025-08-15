import type { VercelRequest, VercelResponse } from '@vercel/node';

const CDN_ROOT = 'https://cdn.img.ly/packages/imgly';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = (req.query.path as string[] | undefined) ?? [];
  if (!segments.length) return res.status(400).send('Missing path');

  // Example valid forwards:
  // /api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk.css
  // /api/cesdk-assets/cesdk-engine/latest/core/cesdk-v1.57.0-ET3GRITS.wasm
  const target = `${CDN_ROOT}/${segments.join('/')}`;

  try {
    const upstream = await fetch(target, {
      headers: {
        ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
        Accept: '*/*',
        'User-Agent': req.headers['user-agent'] || 'cesdk-proxy'
      }
    });

    res.status(upstream.status);
    for (const h of [
      'Content-Type',
      'Content-Length',
      'ETag',
      'Last-Modified',
      'Cache-Control',
      'Accept-Ranges',
      'Content-Range',
      'Cross-Origin-Resource-Policy',
      'Content-Encoding'
    ]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!upstream.headers.get('Cache-Control')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err: any) {
    res.status(502).send(`Proxy error: ${err?.message || String(err)}`);
  }
}

