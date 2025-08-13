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
        const node = containerRef.current;
        if (!node || disposed) return;

        // ✅ Correct CDN bases for v1.57.0
        const UI_ASSETS_BASE =
          'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets';
        const ENGINE_BASE =
          'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0';

        const config: any = {
          license: import.meta.env.VITE_IMGLY_LICENSE_KEY,
          theme: 'dark',
          // UI assets (css, icons, i18n, templates, etc.)
          baseURL: UI_ASSETS_BASE,
          // Some builds of CE.SDK accept an explicit engine base;
          // if your version ignores this, it's harmless.
          engine: { baseURL: ENGINE_BASE },
          ui: { elements: { view: 'default' } }
        };

        instance = await CreativeEditorSDK.create(node, config);

        // Simple export button
        instance?.ui?.addActionButton?.({
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
            } catch (e: any) {
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
          <div className="text-center">
            <p className="font-bold mb-2">Could not load the editor.</p>
            <p className="text-xs text-gray-400">
              This usually means the editor's core files could not be loaded.
              Check the Network tab for 404s. Ensure baseURL and your license
              key are correct.
            </p>
            <p className="font-mono bg-red-900/50 p-2 rounded mt-2 text-xs">
              {error}
            </p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default ImgLyEditor;



