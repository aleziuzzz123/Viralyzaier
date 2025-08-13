import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { useAppContext } from '../contexts/AppContext';

type Props = { projectId: string };

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

        // IMPORTANT: use the proxy and include /assets/ at the end.
        const baseURL = '/api/cesdk-assets/assets/';

        const config = {
          license: import.meta.env.VITE_IMGLY_LICENSE_KEY,
          theme: 'dark' as const,
          baseURL, // SDK will resolve stylesheets + engine core from here
          ui: { elements: { view: 'default' as const } }
        };

        instance = await CreativeEditorSDK.create(el, config);

        // Example "Export" action
        instance.ui?.addActionButton?.({
          id: 'viralyzer-export',
          label: 'Export MP4',
          icon: 'download',
          group: 'primary',
          async onClick() {
            const blob = await instance.export?.render?.({ type: 'video', mimeType: 'video/mp4' });
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            await handleFinalVideoSaved(projectId, url);
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
          <div className="text-center">
            <p className="font-bold mb-2">Could not load the editor.</p>
            <p className="text-xs text-gray-400">
              Check Network tab for 404s; ensure the baseURL points to /api/cesdk-assets/assets/ and VITE_IMGLY_LICENSE_KEY is set.
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



