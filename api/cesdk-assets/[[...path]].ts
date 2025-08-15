// A tiny CDN proxy for CE.SDK assets that compiles without @vercel/node types.

const CDN_ROOT = "https://cdn.img.ly/packages/imgly";

export default async function handler(req: any, res: any) {
  try {
    const segments = (req?.query?.path as string[] | undefined) ?? [];
    if (!segments.length) {
      res.status(400).send("Missing path");
      return;
    }

    // Example forwarded URLs:
    // /api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk.css
    // /api/cesdk-assets/cesdk-engine/latest/core/cesdk-<version>.wasm
    const target = `${CDN_ROOT}/${segments.join("/")}`;

    const upstream = await fetch(target, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers: {
        // let the browser stream the WASM if it asked for a Range
        ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
        Accept: "*/*",
        "User-Agent": req.headers["user-agent"] || "cesdk-proxy",
      },
    });

    // mirror status & a few important headers
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

    // default caching if CDN didn’t send one
    if (!upstream.headers.get("Cache-Control")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    if (req.method === "HEAD") {
      // no body for HEAD
      res.end();
      return;
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    res.send(body);
  } catch (err: any) {
    res
      .status(502)
      .send(`Proxy error: ${err?.message || String(err)}`);
  }
}
