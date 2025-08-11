import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

type Props = {
  onReady?: (instance: any) => void;
};

const ImgLyEditor: React.FC<Props> = ({ onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        const baseURL = '/api/cesdk-assets'; // <= single source of truth

        const cesdk = await CreativeEditorSDK.create(containerRef.current!, {
          license: (window as any).__env?.VITE_IMGLY_LICENSE_KEY,
          baseURL, // tells CE.SDK where /engine, /themes, etc. live (same origin)
          ui: {
            theme: 'dark',
            elements: {
              navigation: { show: true }
            }
          },
          // Extra explicitness for the engine worker path:
          engine: {
            worker: `${baseURL}/engine/cesdk.js`
          }
        });

        if (disposed) return;
        onReady?.(cesdk);
      } catch (e: any) {
        setError(e?.message || String(e));
        console.error('CE.SDK init failed', e);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [onReady]);

  return (
    <div className="w-full h-[72vh]">
      {error && (
        <div className="mb-2 rounded bg-red-900/40 p-3 text-sm text-red-200">
          Failed to initialize editor: {error}
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ImgLyEditor;
