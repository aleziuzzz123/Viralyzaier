import React, { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

type Props = { projectId?: string };

function readEnv(name: string): string | undefined {
  // Vite compile-time first
  // @ts-ignore
  const v = (import.meta as any).env?.[name];
  if (v) return v as string;
  // AI Studio / window.ENV fallback
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return (window as any).ENV[name];
  }
  return undefined;
}

const CDN_ASSETS = 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets/';
const PROD_ASSETS = () => `${window.location.origin}/api/cesdk-assets/`;

export default function ImgLyEditor({ projectId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let instance: any;

    (async () => {
      if (!containerRef.current) return;
      try {
        const hostname = window.location.hostname;
        const onVercel =
          hostname.endsWith('viralyzaier.com') || hostname.endsWith('vercel.app');

        const baseURL = onVercel ? PROD_ASSETS() : CDN_ASSETS;

        const license = readEnv('VITE_IMGLY_LICENSE_KEY');
        if (!license) throw new Error('Missing VITE_IMGLY_LICENSE_KEY');

        instance = await CreativeEditorSDK.create(containerRef.current!, {
          license,
          baseURL: baseURL,
          theme: 'dark'
        });

        if (disposed) {
          instance.dispose();
        }
      } catch (e: any) {
        console.error('CESDK init failed:', e);
        setError(e?.message ?? 'Failed to initialize editor');
      }
    })();

    return () => {
      disposed = true;
      if (instance) {
          instance.dispose();
      }
    };
  }, []);

  return (
    <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-neutral-800">
      {error ? (
        <div className="p-4 text-red-300">
          <p className="font-bold mb-1">Could not load the editor.</p>
          <p className="text-xs">
            {error}. If you are previewing inside AI Studio, the app will use the
            CDN automatically; on viralyzaier.com it uses the proxy at
            <code className="mx-1">/api/cesdk-assets/</code>.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full bg-neutral-900" />
      )}
    </div>
  );
}
