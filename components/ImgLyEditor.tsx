import { useEffect, useRef, useState } from 'react';
import CreativeEditor from '@cesdk/cesdk-js';

function getEnv(key: string): string | undefined {
  // Vite (prod) → import.meta.env; AI Studio → window.ENV (if you added it)
  const v = (import.meta as any)?.env?.[key] ?? (window as any)?.ENV?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

// Decide where to load CE SDK assets from.
function resolveAssetBaseURL(): string {
  const host = typeof window !== 'undefined' ? window.location.host : '';
  // On the production site, use the local proxy.
  if (/viralyzaier\.com/i.test(host)) {
    return '/api/cesdk-assets/';
  }
  // For everything else (AI Studio, local dev), use the CDN.
  return 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets/';
}

// Ensure we have an **absolute** URL when we build link hrefs.
function toAbsoluteURL(base: string): string {
  if (/^https?:\/\//i.test(base)) {
    return base;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return new URL(base, origin).href;
}

function injectCssOnce(baseURL: string) {
  const absBase = toAbsoluteURL(baseURL);
  const ids = ['cesdk-core-css', 'cesdk-theme-css'];
  const hrefs = [
    new URL('stylesheets/cesdk.css', absBase).href,
    new URL('stylesheets/cesdk-themes.css', absBase).href,
  ];
  hrefs.forEach((href, i) => {
    if (!document.getElementById(ids[i])) {
      const link = document.createElement('link');
      link.id = ids[i];
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  });
}

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<CreativeEditor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        if (!containerRef.current) return;
        
        const baseURL = resolveAssetBaseURL();
        injectCssOnce(baseURL);

        const license = getEnv('VITE_IMGLY_LICENSE_KEY');
        if (!license) throw new Error('Missing VITE_IMGLY_LICENSE_KEY');
        
        const inst = await CreativeEditor.create(containerRef.current!, {
          license,
          baseURL: baseURL,
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