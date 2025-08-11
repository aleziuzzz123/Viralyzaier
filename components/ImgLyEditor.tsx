import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { useAppContext } from '../contexts/AppContext.tsx';

type Props = { projectId: string };

const ImgLyEditor: React.FC<Props> = ({ projectId }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { handleFinalVideoSaved } = useAppContext();

  useEffect(() => {
    let disposed = false;
    let cesdk: any;

    (async () => {
      try {
        if (!mountRef.current) return;

        cesdk = await CreativeEditorSDK.create(mountRef.current, {
          license: (window as any).__env?.VITE_IMGLY_LICENSE_KEY,

          // ✅ Point to the TOP of the package – CE.SDK will use /assets/*
          baseURL: '/api/cesdk-assets',

          // ✅ Force the worker to load from our proxy (fixes WASM 404s)
          engine: {
            workerUrl: '/api/cesdk-assets/assets/engine/engine_worker.js'
          },

          theme: 'dark',
          ui: { elements: { view: 'default' } }
        });

        // Example export button
        cesdk.ui?.addActionButton?.({
          id: 'viralyzer-export',
          label: 'Export MP4',
          icon: 'download',
          group: 'primary',
          async onClick() {
            try {
              const blob = await cesdk.export.render({ type: 'video', mimeType: 'video/mp4' });
              const url = URL.createObjectURL(blob);
              await handleFinalVideoSaved(projectId, url);
            } catch (e) {
              console.error('Export failed', e);
            }
          }
        });
      } catch (e: any) {
        if (!disposed) setError(e?.message || 'Failed to initialize editor');
        console.error('CESDK init failed', e);
      }
    })();

    return () => {
      disposed = true;
      try { cesdk?.dispose?.(); } catch {}
    };
  }, [projectId, handleFinalVideoSaved]);

  return (
    <div className="w-full h-[70vh] rounded-xl overflow-hidden bg-black">
      {error ? <div className="p-4 text-red-300 text-sm">{error}</div> : <div ref={mountRef} className="w-full h-full" />}
    </div>
  );
};

export default ImgLyEditor;

