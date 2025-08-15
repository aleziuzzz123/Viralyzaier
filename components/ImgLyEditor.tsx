import { useEffect, useRef, useState } from "react";
import CreativeEditorSDK from "@cesdk/cesdk-js";

function injectStylesheet(href: string) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const ImgLyEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let instance: any;

    (async () => {
      try {
        // Detect AI Studio vs your domain
        const isAiStudio =
          typeof window !== "undefined" &&
          window.location.hostname.includes("aistudio.google.com");

        // IMPORTANT:
        // - For AI Studio we load directly from the IMG.LY CDN.
        // - On your site we go through your proxy (/api/cesdk-assets) which forwards to the CDN.
        const CDN_ROOT = isAiStudio
          ? "https://cdn.img.ly/packages/imgly"
          : "/api/cesdk-assets";

        // ✅ UI styles come from the cesdk-ui package
        injectStylesheet(`${CDN_ROOT}/cesdk-ui/latest/stylesheets/cesdk.css`);
        injectStylesheet(
          `${CDN_ROOT}/cesdk-ui/latest/stylesheets/cesdk-themes.css`
        );

        // ✅ baseURL must point at cesdk-engine (NOT /core and NOT the proxy root)
        const baseURL = `${CDN_ROOT}/cesdk-engine`;

        const LICENSE =
          (import.meta as any).env?.VITE_IMGLY_LICENSE_KEY ||
          (window as any)?.VITE_IMGLY_LICENSE_KEY;

        if (!LICENSE) {
          setError(
            "Missing IMG.LY License key (VITE_IMGLY_LICENSE_KEY). Add it in your env."
          );
          return;
        }

        instance = await CreativeEditorSDK.create(containerRef.current!, {
          license: LICENSE,
          baseURL, // the SDK will request `${baseURL}/core/<wasm|data>`
          ui: { theme: "dark" },
        });
      } catch (e: any) {
        console.error("CESDK init failed:", e);
        setError(
          `${e?.message || e}.\nCheck that /api/cesdk-assets correctly proxies to the CDN and that CSS & license are set.`
        );
      }
    })();

    return () => {
      if (instance) {
        try {
          instance.dispose?.();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="w-full h-[80vh]">
      {error ? (
        <pre style={{ color: "#f87171", whiteSpace: "pre-wrap" }}>{error}</pre>
      ) : (
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
};

export default ImgLyEditor;
