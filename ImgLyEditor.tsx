// components/ImgLyEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

// Allow reading a license injected via <script> in non-Vite contexts.
declare global {
  interface Window {
    VITE_IMGLY_LICENSE_KEY?: string;
  }
}

function ensureTrailingSlash(url: string) {
  return url.endsWith('/') ? url : `${url}/`;
}

function injectCssOnce(href: string) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const ImgLyEditor: FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let instance: any;

    async function init() {
      try {
        setError(null);

        const isAiStudio =
          typeof window !== 'undefined' &&
          window.location.hostname.includes('aistudio.google.com');

        // --------- Where assets come from ----------
        // In AI Studio → direct CDN (CORS-friendly)
        // On your domain → your Vercel proxy (/api/cesdk-assets)
        const CORE_BASE = ensureTrailingSlash(
          isAiStudio
            ? 'https://cdn.img.ly/packages/imgly/cesdk-engine/latest/'
            : `${window.location.origin}/api/cesdk-assets/core/`
        );

        const UI_CSS = isAiStudio
          ? 'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk.css'
          : `${window.location.origin}/api/cesdk-assets/ui/stylesheets/cesdk.css`;
          : `https://www.viralyzaier.com/api/cesdk-assets/cesdk.css`;
          : `https://www.viralyzaier.com/api/cesdk-assets/cesdk-themes.css`;
          : `hhttps://www.viralyzaier.com/api/cesdk-assets/core/cesdk-v1.57.0-ET3GRITS.wasm`;
        
          
        const UI_THEME_CSS = isAiStudio
          ? 'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk-themes.css'
          : `${window.location.origin}/api/cesdk-assets/ui/stylesheets/cesdk-themes.css`;

        // Must inject UI CSS before the editor initializes, or the engine may misbehave.
        injectCssOnce(UI_CSS);
        injectCssOnce(UI_THEME_CSS);

        // --------- License ----------
        const license =
          (import.meta as any)?.env?.VITE_IMGLY_LICENSE_KEY ||
          window.VITE_IMGLY_LICENSE_KEY;

        if (!license) {
          setError(
            'Missing IMG.LY license key (VITE_IMGLY_LICENSE_KEY). Add it to your environment.'
          );
          return;
        }

        // --------- Create the editor ----------
        if (!containerRef.current) {
          setError('Editor container not found.');
          return;
        }

        instance = await CreativeEditorSDK.create(containerRef.current, {
          license,
          baseURL: CORE_BASE, // IMPORTANT: engine (.wasm/.data/.js) is resolved from here
          ui: {
            theme: 'dark',
          },
        });

        // Optional but recommended: load default asset sources (stickers, shapes, etc.)
        try {
          await instance.addDefaultAssetSources?.();
        } catch {
          // Non-fatal if not needed
        }

        // Optional: open a blank scene so users see the canvas immediately
        try {
          await instance.createDesign?.();
        } catch {
          // Ignore if not available in current SDK build
        }

        if (disposed) {
          // If the component unmounted during async init, dispose immediately.
          instance?.dispose?.();
        }
      } catch (e: any) {
        console.error('[CESDK] init failed:', e);
        // Typical engine errors when baseURL/CSS is wrong:
        // - "readFile is not a function"
        // - "Aborted(both async and sync fetching of the wasm failed)"
        setError(
          e?.message ||
            'Editor engine could not be loaded. Check WASM/CSS asset paths and license.'
        );
      }
    }

    init();

    return () => {
      disposed = true;
      try {
        instance?.dispose?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <div style={{ height: '80vh', width: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: 16,
            textAlign: 'center',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system',
          }}
        >
          <div>
            <strong>Editor engine could not be loaded.</strong>
            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{error}</div>
            <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
              In AI Studio the app loads assets from the IMG.LY CDN.
              On your domain they are proxied through <code>/api/cesdk-assets/</code>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImgLyEditor;



