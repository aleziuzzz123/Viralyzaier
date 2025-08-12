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

        // ⚠️ IMPORTANT: Serve everything via your same-origin proxy.
        // Do NOT point this to the CDN; the proxy maps to the CDN internally.
        const PROXY_ROOT = '/api/cesdk-assets'; // this is the package root we proxy

        const config = {
          license: (window as any).__env?.VITE_IMGLY_LICENSE_KEY,
          theme: 'dark' as const,
          baseURL: PROXY_ROOT,             // package root
          core:   { baseURL: 'assets/core/' }, // engine folder for v1.57.0
          // If your host is not cross-origin isolated, keep these to avoid worker errors.
          wasm: { disableMultithread: true, disableSIMD: true },
          ui: { elements: { view: 'default' as const } }
        };

        instance = await CreativeEditorSDK.create(node, config);

        // Optional: belt-and-suspenders URL resolver.
        // Ensures any relative URIs the engine requests are routed through your proxy.
        try {
          const origin = window.location.origin;
          instance?.engine?.editor?.setURIResolver?.((uri: string) => {
            // Leave absolute URLs untouched
            if (/^https?:\/\//i.test(uri)) return uri;
            // Already proxied? pass through
            if (uri.startsWith('/api/cesdk-assets/')) return uri;
            // Route common CE.SDK subpaths through the proxy
            if (
              uri.startsWith('assets/') ||
              uri.startsWith('styles/') ||
              uri.startsWith('themes/') ||
              uri.startsWith('packages/')
            ) {
              return `${origin}${PROXY_ROOT}/${uri.replace(/^\/+/, '')}`;
            }
            return uri;
          });
        } catch {
          // Non-fatal if resolver API shape changes; baseURL/core will still work.
        }

        // Example: simple export button
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
              This usually means the editor&apos;s core files could not be loaded.
              Check the Network tab for 404s and confirm asset URLs resolve under
              <span className="font-mono"> /api/cesdk-assets/</span>.
            </p>
            <p className="font-mono bg-red-900/50 p-2 rounded mt-3 text-xs break-all">{error}</p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
};

export default ImgLyEditor;
