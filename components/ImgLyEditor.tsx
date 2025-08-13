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
    let cesdk: any;

    (async () => {
      try {
        const mount = containerRef.current;
        if (!mount || disposed) return;

        // IMPORTANT:
        // 1) baseURL points to YOUR DOMAIN (the proxy), not cdn.img.ly
        // 2) trailing slash is required
        const config = {
          license: import.meta.env.VITE_IMGLY_LICENSE_KEY as string,
          baseURL: '/api/cesdk-assets/',
          theme: 'dark' as const,
          ui: { elements: { view: 'default' as const } },
        };

        cesdk = await CreativeEditorSDK.create(mount, config);

        // Optional export action
        cesdk.ui?.addActionButton?.({
          id: 'viralyzer-export',
          label: 'Export MP4',
          icon: 'download',
          group: 'primary',
          async onClick() {
            try {
              const blob = await cesdk.export?.render?.({
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
      try { cesdk?.dispose?.(); } catch {}
    };
  }, [projectId, handleFinalVideoSaved]);

  return (
    <div className="w-full h-[70vh] rounded-xl overflow-hidden bg-black">
      {error ? (
        <div className="p-4 text-red-300 text-sm flex items-center justify-center h-full bg-gray-900">
          <div className="text-center max-w-lg">
            <p className="font-bold mb-2">Could not load the editor.</p>
            <p className="text-xs text-gray-400">
              This usually means the core files weren’t reachable. Verify the proxy at
              <code className="px-1">/api/cesdk-assets/stylesheets/cesdk.css</code> and your Vercel env var <code>VITE_IMGLY_LICENSE_KEY</code>.
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


