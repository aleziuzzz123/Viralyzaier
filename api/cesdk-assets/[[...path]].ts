// api/cesdk-assets/[[...path]].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const CDN_ROOT = "https://cdn.img.ly/packages/imgly";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = (req.query.path as string[] | undefined) ?? [];
  if (!segments.length) {
    res.status(400).send("Missing path");
    return;
  }

  // Forward any path e.g.
  // /api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk.css
  // /api/cesdk-assets/cesdk-engine/core/cesdk-v1.57.0-ET3GRITS.wasm
  const target = `${CDN_ROOT}/${segments.join("/")}`;

  try {
    const upstream = await fetch(target, {
      headers: {
        // Pass through range requests so the browser can stream the WASM
        ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
        Accept: "*/*",
        "User-Agent": req.headers["user-agent"] || "cesdk-proxy",
      },
    });

    // Mirror status and selected headers
    res.status(upstream.status);
    const copy = (h: string) => {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    };
    copy("Content-Type");
    copy("Content-Length");
    copy("ETag");
    copy("Last-Modified");
    copy("Cache-Control");
    copy("Accept-Ranges");
    copy("Content-Range");
    copy("Cross-Origin-Resource-Policy");

    // Default caching if CDN doesn't send one
    if (!upstream.headers.get("Cache-Control")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err: any) {
    res.status(502).send(`Proxy error: ${err?.message || String(err)}`);
  }
}

