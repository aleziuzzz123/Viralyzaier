import { useEffect, useRef, useState } from "react";
import CreativeEditorSDK from "@cesdk/cesdk-js";

function injectCss(href: string) {
  if (document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const ImgLyEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        // ---- 1) set up the proxy base once
        const PROXY = "/api/cesdk-assets";
        // use 'latest' so you don’t pin to an exact version path that might not exist
        const UI_BASE = `${PROXY}/cesdk-ui/latest`;
        const ENGINE_BASE = `${PROXY}/cesdk-engine/latest`;

        // ---- 2) inject required UI css
        injectCss(`${UI_BASE}/stylesheets/cesdk.css`);
        injectCss(`${UI_BASE}/stylesheets/cesdk-themes.css`);

        // ---- 3) quick proxy health check (HEAD)
        {
          const head = await fetch(`${UI_BASE}/stylesheets/cesdk.css`, { method: "HEAD" });
          if (!head.ok) {
            throw new Error(
              `Could not reach ${PROXY} via ${UI_BASE}/stylesheets/cesdk.css: Proxy check failed (${head.status}). ` +
              `${PROXY} must return 200.`
            );
          }
        }

        // ---- 4) license (build-time Vite var)
        const LICENSE =
          import.meta.env.VITE_IMGLY_LICENSE_KEY || // your key
          import.meta.env.VITE_IMG_LY_LICENSE_KEY; // accept either, just in case

        if (!LICENSE) {
          throw new Error(
            "Missing VITE_IMGLY_LICENSE_KEY – add it under Vercel → Settings → Environment Variables (Production)."
          );
        }

        // ---- 5) create the editor
        const instance = await CreativeEditorSDK.create(containerRef.current!, {
          license: LICENSE,
          // engine + UI will fetch everything from the proxy we configured above
          baseURL: ENGINE_BASE,
          ui: { baseURL: UI_BASE },
          // simple uploads stub; adapt as needed
          callbacks: { onUpload: "local" },
        });

        if (disposed) instance.dispose();
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    }

    if (containerRef.current) init();
    return () => { disposed = true; };
  }, []);

  return (
    <div className="w-full">
      <div ref={containerRef} style={{ height: "80vh", width: "100%" }} />
      {error && (
        <pre
          style={{
            color: "#f77",
            background: "rgba(255,0,0,0.05)",
            padding: 12,
            marginTop: 12,
            whiteSpace: "pre-wrap",
            borderRadius: 8,
          }}
        >
          {error}
        </pre>
      )}
    </div>
  );
};

export default ImgLyEditor;



