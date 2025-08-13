// components/ImgLyEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { useAppContext } from '../contexts/AppContext.tsx';

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

        const config = {
          license: import.meta.env.VITE_IMGLY_LICENSE_KEY?.trim(),
          theme: 'dark' as const,
          // IMPORTANT: use the proxy; the trailing slash matters
          baseURL: '/api/cesdk-assets/',
          ui: { elements: { view: 'default' as const } },
        };

        instance = await CreativeEditorSDK.create(node, config);

        // Optional: export button
        (instance as any).ui?.addActionButton?.({
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
              This usually means the editor’s core files could not be fetched. Ensure the proxy and license are set.
            </p>
            <p className="font-mono bg-red-900/50 p-2 rounded mt-2 text-xs break-all">{error}</p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default ImgLyEditor;



