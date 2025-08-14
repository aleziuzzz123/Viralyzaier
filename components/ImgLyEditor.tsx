'use client';
import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

// Helper to get env vars safely from either Vite or window.ENV
function getEnv(key: string): string | undefined {
    const v = (import.meta as any)?.env?.[key] ?? (window as any)?.ENV?.[key];
    return typeof v === 'string' && v.trim() ? v : undefined;
}

// Helper to inject CSS before SDK init
function ensureCss(href: string) {
  if (!document.querySelector(`link[data-cesdk="${href}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-cesdk', href);
    document.head.appendChild(link);
  }
}

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    (async () => {
      try {
        if (!containerRef.current) return;

        const onAiStudio =
          typeof window !== 'undefined' &&
          (window.top?.location?.hostname ?? window.location.hostname).includes('aistudio.google.com');

        const baseURL = onAiStudio ? 'https://cdn.img.ly/cesdk/' : '/api/cesdk-assets/';
        
        const license = getEnv('VITE_IMGLY_LICENSE_KEY') || '';
        if (!license) {
          throw new Error("VITE_IMGLY_LICENSE_KEY is not configured. Please check your setup.");
        }
        
        // The CSS paths still need to be fully qualified and versioned. The proxy will handle this path.
        const VERSION = '1.57.0'; // from package.json
        const cssBase = onAiStudio ? `https://cdn.img.ly/packages/imgly/cesdk/${VERSION}/assets/ui` : `/api/cesdk-assets/${VERSION}/assets/ui`;
        ensureCss(`${cssBase}/stylesheets/cesdk.css`);
        ensureCss(`${cssBase}/stylesheets/cesdk-themes.css`);

        const instance = await CreativeEditorSDK.create(containerRef.current, {
          license,
          baseURL, // The SDK will request paths like `v1.57.0/assets/core` relative to this
          ui: { elements: { theme: 'dark' } }
        });

        await instance.createDesignScene();

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
            If you’re previewing in AI Studio, assets come from the CDN. On viralyzaier.com they’re served from the <code>/api/cesdk-assets</code> proxy.
          </div>
        </div>
      ) : null}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}