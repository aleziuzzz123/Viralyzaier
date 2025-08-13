import { useEffect, useRef, useState } from "react";
import CreativeEditorSDK from "@cesdk/cesdk-js";

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let instance: any;

    async function init() {
      try {
        const license = import.meta.env.VITE_IMGLY_LICENSE_KEY;
        if (!license) throw new Error("VITE_IMGLY_LICENSE_KEY is missing");

        instance = await CreativeEditorSDK.create(containerRef.current!, {
          // your license
          license,

          // IMPORTANT: load assets & UI straight from the CDN (no proxy)
          baseURL: "https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets",

          theme: "dark"
        });

        // Optional: demo assets & a fresh design scene
        await instance.addDefaultAssetSources();
        await instance.addDemoAssetSources({ sceneMode: "Design" });
        await instance.createDesignScene();
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? String(e));
      }
    }

    init();
    return () => { instance?.dispose?.(); };
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Could not load the editor: {error}
      </div>
    );
  }

  return <div ref={containerRef} style={{ height: "calc(100vh - 80px)" }} />;
}



