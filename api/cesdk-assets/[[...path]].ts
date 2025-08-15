// api/cesdk-assets/[[...path]].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Point directly at the folder that contains "core" and "ui"
const CDN_ROOT = 'https://cdn.img.ly/packages/imgly/cesdk-engine/latest/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = ((req.query.path as string[] | undefined) ?? []).join('/');
  if (!path) {
    res.status(400).send('Missing path');
    return;
  }

  // Build the upstream URL safely (avoids double slashes)
  const upstreamURL = new URL(path, CDN_ROOT).toString();

  try {
    const upstream = await fetch(upstreamURL, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: {
        ...(req.headers.range ? { range: String(req.headers.range) } : {}),
        accept: (req.headers.accept as string) ?? '*/*',
        'user-agent': (req.headers['user-agent'] as string) ?? 'cesdk-proxy',
      },
    });

    // Mirror status + key headers (important for WASM streaming)
    res.status(upstream.status);
    for (const h of [
      'content-type',
      'content-length',
      'accept-ranges',
      'content-range',
      'cache-control',
      'last-modified',
      'etag',
    ]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!upstream.headers.get('cache-control')) {
      res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    }

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    res.send(body);
  } catch (err: any) {
    res.status(502).send(`Proxy error: ${err?.message ?? String(err)}`);
  }
}
