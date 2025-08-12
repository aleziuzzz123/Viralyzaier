import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { useAppContext } from '../contexts/AppContext.tsx';

type Props = { projectId: string };

const CSS_URLS = [
  // NOTE: Correct path is /styles/, not /stylesheets/
  '/api/cesdk-assets/styles/cesdk.css',
  '/api/cesdk-assets/styles/cesdk-themes.css'
];

function injectCssOnce() {
  CSS_URLS.forEach(href => {
    const exists = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
      .some(l => l.href.includes('/api/cesdk-assets/styles/cesdk'));
    if (exists) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });
}

const ImgLyEditor: React.FC<Props> = ({ projectId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { handleFinalVideoSaved } = useAppContext();

  useEffect(() => {
    let disposed = false;
    let instance: any;

    (async () => {
      try {
        const el = containerRef.current;
        if (!el || disposed) return;

        // Ensure CE.SDK UI CSS is present (from our proxy)
        injectCssOnce();

        // IMPORTANT: baseURL points to our proxy root.
        const baseURL = '/api/cesdk-assets';

        instance = await CreativeEditorSDK.create(el, {
          license: (window as any).__env?.VITE_IMGLY_LICENSE_KEY,
          theme: 'dark',
          baseURL,
          // If your site isn't cross-origin isolated, keep threads/SIMD off:
          wasm: { disableMultithread: true, disableSIMD: true },
          ui: { elements: { view: 'default' } }
        });

        // Optional quick export
        instance.ui?.addActionButton?.({
          id: 'viralyzer-export',
          label: 'Export MP4',
          icon: 'download',
          group: 'primary',
          async onClick() {
            try {
              const blob = await instance.export?.render?.({ type: 'video', mimeType: 'video/mp4' });
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              await handleFinalVideoSaved(projectId, url);
            } catch (e) {
              console.error('Export failed', e);
            }
          }
        });
      } catch (e: any) {
        console.error('CESDK init failed', e);
        if (!disposed) setError(e?.message || 'Failed to initialize editor');
      }
    })();

    return () => {
      disposed = true;
      try { instance?.dispose?.(); } catch {}
    };
  }, [projectId, handleFinalVideoSaved]);

  return (
    <div className="w-full h-[70vh] rounded-xl overflow-hidden bg-black">
      {error ? (
        <div className="p-4 text-red-300 text-sm flex items-center justify-center h-full bg-gray-900">
          <div className="text-center max-w-xl">
            <p className="font-bold mb-2">Could not load the editor.</p>
            <p className="text-xs text-gray-400">
              Check Network for 200s on:
              <br />/api/cesdk-assets/styles/cesdk.css
              <br />/api/cesdk-assets/styles/cesdk-themes.css
              <br />/api/cesdk-assets/core/cesdk-v1.57.0-*.wasm
            </p>
            <p className="font-mono bg-red-900/50 p-2 rounded mt-2 text-xs">{error}</p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default ImgLyEditor;
