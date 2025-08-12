import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { useAppContext } from '../contexts/AppContext'; // adjust path if needed

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

        // license from Vercel env (Vite)
        const license =
          import.meta.env.VITE_IMGLY_LICENSE_KEY ||
          (window as any).__env?.VITE_IMGLY_LICENSE_KEY;

        // IMPORTANT: same-origin proxy root that contains /assets/
        const baseURL = '/api/cesdk-assets/assets';

        instance = await CreativeEditorSDK.create(el, {
          license,
          theme: 'dark',
          baseURL,                  // points to .../assets
          core: { baseURL: 'engine/' }, // engine lives under assets/engine/
          wasm: { disableMultithread: true, disableSIMD: true }, // safe if COOP/COEP not set
          ui: { elements: { view: 'default' } }
        });

        // optional: export action
        instance.ui?.addActionButton?.({
          id: 'viralyzer-export',
          label: 'Export MP4',
          icon: 'download',
          group: 'primary',
          async onClick() {
            try {
              const blob = await instance.export?.render?.({
                type: 'video',
                mimeType: 'video/mp4'
              });
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

    return () => { disposed = true; try { instance?.dispose?.(); } catch {} };
  }, [projectId, handleFinalVideoSaved]);

  return (
    <div className="w-full h-[70vh] rounded-xl overflow-hidden bg-black">
      {error ? (
        <div className="p-4 text-red-300 text-sm flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <p className="font-bold mb-2">Could not load the editor.</p>
            <p className="text-xs text-gray-400">
              Check DevTools → Network. These must be 200:
              /api/cesdk-assets/assets/engine/engine_worker.js and *.wasm
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

