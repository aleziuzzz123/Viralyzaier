import { useEffect, useRef, useState } from "react";
import CreativeEditorSDK from "@cesdk/cesdk-js";

function injectCss(href: string) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const ImgLyEditor = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Inject UI CSS (rewrite sends this to the CDN)
        injectCss("/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk.css");
        injectCss("/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk-themes.css");

        const license = import.meta.env.VITE_IMG_LY_LICENSE_KEY;
        if (!license) {
          throw new Error(
            "Missing VITE_IMG_LY_LICENSE_KEY – set it in your Vercel project env vars."
          );
        }

        // 2) Create the editor
        const cesdk = await CreativeEditorSDK.create(containerRef.current!, {
          license,
          // Make sure the engine loads its wasm/data from our rewrite
          baseURL: "/api/cesdk-assets/cesdk-ui/latest", // UI looks here for assets
          engineBaseUrl: "/api/cesdk-assets/cesdk-engine/latest", // wasm/data live here
          theme: "dark",
          ui: { panels: { inspector: true, pages: true, libraries: true } }
        });

        instanceRef.current = cesdk;

        // Optional: load a blank scene
        await cesdk.createDesignScene();
      } catch (e: any) {
        setError(
          `${e?.message || e} — Check the Network tab: /api/cesdk-assets/* must return 200.`
        );
      }
    };

    run();

    return () => {
      if (instanceRef.current) {
        instanceRef.current.dispose?.();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      {error && (
        <div style={{ color: "#ff6b6b", padding: 12, fontFamily: "monospace" }}>
          {error}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "80vh" }} />
    </div>
  );
};

export default ImgLyEditor;


