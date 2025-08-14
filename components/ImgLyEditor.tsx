import { useEffect, useRef, useState } from 'react';
import CreativeEditor from '@cesdk/cesdk-js';

// Helper to get env vars safely from either Vite or window.ENV
function getEnv(key: string): string | undefined {
  const v = (import.meta as any)?.env?.[key] ?? (window as any)?.ENV?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<CreativeEditor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      // Guard against running in non-browser environments
      if (typeof window === 'undefined' || !containerRef.current) {
        return;
      }
      
      try {
        const host = window.location.hostname;
        
        // This logic correctly determines the asset path whether running in AI Studio (CDN) or on Vercel (proxy).
        const onAiStudio = /aistudio\.google\.com|googleusercontent\.com/i.test(host);

        // The 'baseURL' for the SDK should point to the directory containing the 'core', 'ui' etc. folders.
        // On the CDN, this is the 'assets' directory.
        const baseURL = onAiStudio
          ? 'https://cdn.img.ly/packages/cesdk-js/1.57.0/assets/'
          : '/api/cesdk-assets/assets/';

        const license = getEnv('VITE_IMGLY_LICENSE_KEY');
        if (!license) {
          throw new Error('Missing VITE_IMGLY_LICENSE_KEY. Please check your configuration in index.html.');
        }

        const inst = await CreativeEditor.create(containerRef.current, {
          license,
          baseURL, // Use the corrected base URL
          theme: 'dark'
        });

        if (disposed) {
          inst.dispose();
          return;
        }
        instanceRef.current = inst;
        
        // Load default and demo assets to populate the editor.
        // The baseURL for this method must be an absolute URL.
        const assetSourceBaseURL = onAiStudio
            ? 'https://cdn.img.ly/packages/cesdk-js/1.57.0/assets/'
            : `${window.location.origin}/api/cesdk-assets/assets/`;

        await inst.addDefaultAssetSources({ baseURL: assetSourceBaseURL });
        await inst.addDemoAssetSources({ sceneMode: 'Design', baseURL: assetSourceBaseURL });
        await inst.createDesignScene();

      } catch (e: any) {
        console.error('CESDK init failed:', e);
        setError(e?.message || String(e));
      }
    })();

    return () => {
      disposed = true;
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-zinc-800">
      {error ? (
        <div className="p-4 text-red-400 text-sm">
          <p className="font-semibold">Editor engine could not be loaded.</p>
          <code className="text-xs bg-zinc-900 px-2 py-1 rounded mt-2 inline-block">
            {error}
          </code>
          <p className="mt-2 text-zinc-400">
            This is often due to an incorrect asset path or a missing license key.
            The app is configured to load assets from the IMG.LY CDN when run in AI Studio,
            and through a proxy (`/api/cesdk-assets/`) in other environments.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
}
