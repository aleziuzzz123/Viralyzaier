import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK, { addDefaultAssetSources } from '@cesdk/cesdk-js';

function injectCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const isAiStudio =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('aistudio.google.com');

// Where the engine & default assets live
const ENGINE_BASE = isAiStudio
  ? 'https://cdn.img.ly/packages/imgly/cesdk-engine/latest/'
  : '/api/cesdk-assets/cesdk-engine/';

// Where the UI CSS lives
const UI_CSS = isAiStudio
  ? [
      'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk.css',
      'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk-themes.css'
    ]
  : [
      '/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk.css',
      '/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk-themes.css'
    ];

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    UI_CSS.forEach(injectCss);

    let disposed = false;
    (async () => {
      try {
        const licenseKey =
          (import.meta as any).env?.VITE_IMGLY_LICENSE_KEY ?? '';

        if (!licenseKey) {
          setError(
            'Missing VITE_IMGLY_LICENSE_KEY env var. Add it in Vercel → Project → Settings → Environment Variables.'
          );
          return;
        }

        const instance = await CreativeEditorSDK.create(containerRef.current!, {
          license: licenseKey,
          baseURL: ENGINE_BASE, // *** critical: includes /cesdk-engine/ ***
          ui: { theme: 'dark' }
        });

        // Pull in stickers, shapes, etc. from the same base
        await addDefaultAssetSources(instance, { baseURL: ENGINE_BASE });

        if (disposed) instance.dispose();
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div className="w-full h-[70vh]">
      {error ? (
        <div className="p-4 text-red-500 text-sm whitespace-pre-wrap">{error}</div>
      ) : null}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
