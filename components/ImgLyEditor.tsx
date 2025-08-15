// components/ImgLyEditor.tsx
import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK, { CreativeEditor } from '@cesdk/cesdk-js';

function injectCSS(href: string) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const ImgLyEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let instance: CreativeEditor | null = null;

    const onAiStudio =
      typeof window !== 'undefined' &&
      window.location.hostname.includes('aistudio.google.com');

    // Where the engine files live
    const ENGINE_BASE = onAiStudio
      ? 'https://cdn.img.ly/packages/imgly/cesdk-engine/latest/' // CDN inside AI Studio
      : '/api/cesdk-assets/'; // proxied through Vercel in production

    // Correct CSS locations
    const CSS = onAiStudio
      ? [
          'https://cdn.img.ly/packages/imgly/cesdk-engine/latest/ui/stylesheets/cesdk.css',
          'https://cdn.img.ly/packages/imgly/cesdk-engine/latest/ui/stylesheets/cesdk-themes.css',
        ]
      : [
          '/api/cesdk-assets/ui/stylesheets/cesdk.css',
          '/api/cesdk-assets/ui/stylesheets/cesdk-themes.css',
        ];

    async function init() {
      try {
        // Ensure CSS is present BEFORE init
        CSS.forEach(injectCSS);

        const license =
          (import.meta as any).env?.VITE_IMGLY_LICENSE_KEY ??
          (process as any)?.env?.VITE_IMGLY_LICENSE_KEY;

        if (!license) {
          setError(
            'Missing IMG.LY license key (VITE_IMGLY_LICENSE_KEY). Add it to your env.'
          );
          return;
        }

        instance = await CreativeEditorSDK.create(containerRef.current!, {
          license,
          baseURL: ENGINE_BASE, // 👈 do not add "cesdk-engine" or "latest" again
          theme: 'dark',
          // CESDK expects theme inside ui
          ui: {
            theme: 'dark',
          },
        });
      } catch (e: any) {
        console.error('CE.SDK init failed', e);
        setError(String(e?.message ?? e));
      }
    }

    init();
    return () => {
      if (instance) {
        instance.dispose();
        instance = null;
      }
    };
  }, []);

  return (
    <div style={{ height: '80vh' }}>
      {error ? (
        <pre style={{ color: '#f66' }}>{error}</pre>
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  );
};

export default ImgLyEditor;
