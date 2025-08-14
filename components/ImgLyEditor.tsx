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
        
        // This is the core logic. It determines the correct *absolute* URL for assets.
        const onAiStudio = /ai\.studio|usercontent\.goog/i.test(host);

        const baseURL = onAiStudio
          ? 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/' // Use absolute CDN URL in AI Studio
          : '/api/cesdk-assets/';                             // Use relative proxy URL on production/other envs

        const license = getEnv('VITE_IMGLY_LICENSE_KEY');
        if (!license) {
          throw new Error('Missing VITE_IMGLY_LICENSE_KEY. Please check your configuration.');
        }

        const inst = await CreativeEditor.create(containerRef.current, {
          license,
          baseURL, // baseURL is a top-level property
          theme: 'dark'
        });

        if (disposed) {
          inst.dispose();
          return;
        }
        instanceRef.current = inst;
      } catch (e: any) {
        console.error('CESDK init failed:', e);
        setError(e?.message || String(e));
      }
    })();

    return () => {
      disposed = true;
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []); // Run only once on mount

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-zinc-800">
      {error ? (
        <div className="p-4 text-red-400 text-sm">
          <p className="font-semibold">Editor engine could not be loaded.</p>
          <code className="text-xs bg-zinc-900 px-2 py-1 rounded mt-2 inline-block">
            {error}
          </code>
          <p className="mt-2 text-zinc-400">
            (If you’re previewing in AI Studio, assets come from the CDN. On
            viralyzaier.com they’re served via <code>/api/cesdk-assets/</code>.)
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
}
