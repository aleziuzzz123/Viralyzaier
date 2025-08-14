import React, { useEffect, useRef, useState } from "react";
import CreativeEditorSDK, { DefaultAssets } from "@cesdk/cesdk-js";

type Props = {
  projectId?: string;
  onSaved?: (blob: Blob) => void;
};

const ImgLyEditor: React.FC<Props> = ({ projectId, onSaved }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<CreativeEditorSDK | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to read license from Vite env or window.ENV (fallback)
  const license =
    import.meta.env.VITE_IMGLY_LICENSE_KEY ||
    (window as any)?.ENV?.VITE_IMGLY_LICENSE_KEY;

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        if (!containerRef.current) return;

        if (!license) {
          throw new Error(
            "Missing VITE_IMGLY_LICENSE_KEY. Set it in Vercel env and redeploy."
          );
        }

        // IMPORTANT: baseURL points to CDN *assets* folder
        const baseURL =
          "https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets";

        const cesdk = await CreativeEditorSDK.create(containerRef.current, {
          license: String(license),
          baseURL, // this enables loading core/…(wasm,data,js) and ui/stylesheets/…
          ui: {
            // theme configuration MUST live under ui
            theme: "light",
          },
          // Optional: preload default asset sources
          assets: {
            resolver: DefaultAssets({ baseURL }),
          },
        });

        if (disposed) {
          await cesdk.dispose();
          return;
        }

        instanceRef.current = cesdk;

        // Example: load a blank scene
        await cesdk.engine.scene.reset();

        // If you load a project by ID, do it here
        if (projectId) {
          // await loadFromYourBackend(projectId, cesdk);
        }
      } catch (e: any) {
        console.error("CESDK init failed:", e);
        setError(e?.message || "Failed to initialize editor");
      }
    })();

    return () => {
      disposed = true;
      if (instanceRef.current) {
        instanceRef.current.dispose().catch(() => {});
        instanceRef.current = null;
      }
    };
  }, [license, projectId]);

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden">
      {error ? (
        <div className="p-4 text-red-300 bg-red-900/30 rounded-md">
          <p className="font-bold mb-1">Could not load the editor.</p>
          <p className="text-xs">
            Check VITE_IMGLY_LICENSE_KEY and network access to cdn.img.ly.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default ImgLyEditor;