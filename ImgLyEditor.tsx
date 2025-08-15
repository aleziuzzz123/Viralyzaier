import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

function injectCss(href: string) {
  if (document.querySelector(`link[data-cesdk-css="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-cesdk-css', href);
  document.head.appendChild(link);
}

const ImgLyEditor: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setErr(null);

        const isAiStudio =
          typeof window !== 'undefined' &&
          window.location.hostname.includes('aistudio.google.com');

        const ENGINE_BASE = isAiStudio
          ? 'https://cdn.img.ly/packages/imgly/cesdk-engine/latest'
          : '/api/cesdk-assets/cesdk-engine/latest';

        const CSS = isAiStudio
          ? [
              'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk.css',
              'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk-themes.css'
            ]
          : [
              '/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk.css',
              '/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk-themes.css'
            ];
        CSS.forEach(injectCss);

        const LICENSE =
          (import.meta as any).env?.VITE_IMGLY_LICENSE_KEY ||
          (process as any).env?.VITE_IMGLY_LICENSE_KEY;

        if (!LICENSE) {
          setErr('Missing IMG.LY license (VITE_IMGLY_LICENSE_KEY).');
          return;
        }
        if (!hostRef.current) return;

        const instance = await CreativeEditorSDK.create(hostRef.current, {
          baseURL: ENGINE_BASE,
          license: LICENSE,
          ui: { theme: 'dark' }
        });

        if (cancelled) {
          await instance.dispose?.();
          return;
        }
        editorRef.current = instance;
      } catch (e: any) {
        console.error(e);
        setErr(
          e?.message ||
            'Failed to initialize CESDK. Check baseURL, CSS & license.'
        );
      }
    }

    boot();
    return () => {
      cancelled = true;
      editorRef.current?.dispose?.();
    };
  }, []);

  return (
    <div className="w-full h-full">
      {err && (
        <div className="p-3 text-sm text-red-400 whitespace-pre-wrap">{err}</div>
      )}
      <div ref={hostRef} style={{ width: '100%', height: '80vh' }} />
    </div>
  );
};

export default ImgLyEditor;


