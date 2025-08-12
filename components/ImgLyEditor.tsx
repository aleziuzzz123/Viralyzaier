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
        
        instance = await CreativeEditorSDK.create(node, {
          license: (window as any).__env?.VITE_IMGLY_LICENSE_KEY,
          theme: 'dark',
          // Set baseURL to the root of the proxy.
          // The SDK will correctly look for UI assets in `/assets` and engine assets in `/engine` relative to this path.
          baseURL: '/api/cesdk-assets',
          core: {
            baseURL: 'engine/' 
          },
          ui: { elements: { view: 'default' } }
        });

        // Example: expose a simple export button (optional)
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

              // upload to your storage / then save URL
              const url = URL.createObjectURL(blob);
              await handleFinalVideoSaved(projectId, url);
            } catch (e: any) {
              console.error('Export failed', e);
            }
          }
        });
      } catch (e: any) {
        console.error('CESDK init failed', e);
        if (!disposed) {
            setError(e?.message || 'Failed to initialize editor');
        }
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
        <div className="p-4 text-red-300 text-sm">{error}</div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default ImgLyEditor;