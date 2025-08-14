import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    ENV?: Record<string, string>;
  }
}

const env = (k: string) =>
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) ||
  (typeof window !== 'undefined' ? window.ENV?.[k] : undefined);

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let instance: any;

    (async () => {
      try {
        if (!containerRef.current) return;
        const { default: CreativeEditor } = await import('@cesdk/cesdk-js');

        const license = env('VITE_IMGLY_LICENSE_KEY');
        if (!license) throw new Error('Missing VITE_IMGLY_LICENSE_KEY');

        instance = await CreativeEditor.create(containerRef.current!, {
          license,
          // IMPORTANT: this must match the edge route above
          baseURL: '/api/cesdk-assets',
          ui: { theme: 'dark' } as any,
        });

        if (disposed) {
          instance.dispose();
        }
      } catch (e: any) {
        console.error('CESDK init failed:', e);
        setError(e?.message || 'Failed to initialize editor');
      }
    })();

    return () => {
      disposed = true;
      // The instance might not be assigned if the async function fails early.
      if (instance) {
        try {
          instance.dispose();
        } catch (disposeError) {
          // Log dispose error if necessary, but don't crash.
          console.error('CESDK dispose failed:', disposeError);
        }
      }
    };
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-500 font-mono text-sm">
        Could not load the editor: {error}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-[70vh] rounded-xl bg-neutral-900" />;
}