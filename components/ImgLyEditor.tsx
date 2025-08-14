'use client';
import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

// Helper to get env vars safely from either Vite or window.ENV
function getEnv(key: string): string | undefined {
    const v = (import.meta as any)?.env?.[key] ?? (window as any)?.ENV?.[key];
    return typeof v === 'string' && v.trim() ? v : undefined;
}

// Small helper to inject CSS before SDK init
function injectCss(href: string) {
  const id = `cesdk-css-${href}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    (async () => {
      try {
        if (!containerRef.current) return;

        const onProd = typeof location !== 'undefined' && location.hostname.endsWith('viralyzaier.com');
        const CDN_ASSETS = 'https://cdn.img.ly/packages/imgly/cesdk/1.57.0/assets';
        const LOCAL_ASSETS_PATH = '/assets';
        
        const assetsBaseURL = onProd ? LOCAL_ASSETS_PATH : CDN_ASSETS;
        const coreBaseURL = onProd ? 'core/' : `${assetsBaseURL}/core`;

        // Absolute URL is needed for injecting CSS and for addDefaultAssetSources
        const absoluteAssetsURL = onProd ? `${window.location.origin}${LOCAL_ASSETS_PATH}` : CDN_ASSETS;

        // Load CESDK UI styles (must exist before init)
        injectCss(`${absoluteAssetsURL}/ui/stylesheets/cesdk.css`);
        injectCss(`${absoluteAssetsURL}/ui/stylesheets/cesdk-themes.css`);

        const licenseKey = getEnv('VITE_IMGLY_LICENSE_KEY');
        if (!licenseKey) {
            throw new Error("VITE_IMGLY_LICENSE_KEY is not configured. Please check your setup.");
        }

        const instance = await CreativeEditorSDK.create(containerRef.current, {
          license: licenseKey,
          baseURL: assetsBaseURL,             // Use relative path for local, absolute for CDN
          core: { baseURL: coreBaseURL },     // Relative to baseURL for local
          theme: 'dark'
        });

        // Register default libraries (stickers, shapes, etc.) which requires an absolute URL.
        await instance.addDefaultAssetSources({ baseURL: absoluteAssetsURL });
        await instance.createDesignScene(); // optional: ensures we see a canvas

        dispose = () => instance.dispose();
      } catch (e: any) {
        console.error('CESDK init failed:', e);
        setError(e?.message || String(e));
      }
    })();

    return () => { try { dispose?.(); } catch {} };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {error ? (
        <div style={{ color: '#f99', padding: 16 }}>
          <strong>Editor engine could not be loaded.</strong>
          <div>{error}</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            If you’re previewing in AI Studio, assets come from the CDN. On viralyzaier.com they’re served from <code>/assets</code>.
          </div>
        </div>
      ) : null}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
