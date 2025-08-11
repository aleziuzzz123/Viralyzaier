// components/ImgLyEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { useAppContext } from '../contexts/AppContext.tsx';

type Props = { projectId: string };

const ImgLyEditor: React.FC<Props> = ({ projectId }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const { handleFinalVideoSaved } = useAppContext();

  useEffect(() => {
    let disposed = false;
    let instance: any;

    (async () => {
      try {
        const el = ref.current;
        if (!el || disposed) return;

        instance = await CreativeEditorSDK.create(el, {
          license: (window as any).__env?.VITE_IMGLY_LICENSE_KEY,
          theme: 'dark',

          // ✅ All engine files come from your own origin via the Edge proxy:
          baseURL: '/api/cesdk-assets/assets',
          engine: {
            // ✅ Make the worker path explicit so it doesn’t resolve to /
            workerPath: '/api/cesdk-assets/assets/engine/engine_worker.js'
          },

          ui: { elements: { view: 'default' } }
        });

        // Minimal example export
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
            } catch (e: any) {
              console.error('Export failed', e);
            }
          }
        });
      } catch (e: any) {
        console.error('CESDK init failed', e);
        if (!disposed) setErr(e?.message || 'Failed to initialize editor');
      }
    })();

    return () => {
      disposed = true;
      try { instance?.dispose?.(); } catch {}
    };
  }, [projectId, handleFinalVideoSaved]);

  return (
    <div className="w-full h-[70vh] rounded-xl overflow-hidden bg-black">
      {err ? <div className="p-4 text-red-300 text-sm">{err}</div> : <div ref={ref} className="w-full h-full" />}
    </div>
  );
};

export default ImgLyEditor;
