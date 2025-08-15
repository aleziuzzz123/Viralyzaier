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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<any | null>(null);

  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        setError(null);

        const isAiStudio =
          typeof window !== 'undefined' &&
          window.location.hostname.includes('aistudio.google.com');

        const ENGINE_BASE = isAiStudio
          ? 'https://cdn.img.ly/packages/imgly/cesdk-engine/latest'
          : '/api/cesdk-assets/cesdk-engine/latest';

        const UI_CSS = isAiStudio
          ? [
              'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk.css',
              'https://cdn.img.ly/packages/imgly/cesdk-ui/latest/stylesheets/cesdk-themes.css'
            ]
          : [
              '/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk.css',
              '/api/cesdk-assets/cesdk-ui/latest/stylesheets/cesdk-themes.css'
            ];

        UI_CSS.forEach(injectCss);

        const LICENSE =
          (import.meta as any).env?.VITE_IMGLY_LICENSE_KEY ||
          (process as any).env?.VITE_IMGLY_LICENSE_KEY;

        if (!LICENSE) {
          setError('Missing IMG.LY license (VITE_IMGLY_LICENSE_KEY).');
          return;
        }

        if (!containerRef.current) return;

        const editor = await CreativeEditorSDK.create(containerRef.current, {
          baseURL: ENGINE_BASE,
          license: LICENSE,
          ui: { theme: 'dark' }
        });

        if (disposed) {
          await editor.dispose();
          return;
        }
        setInstance(editor);
      } catch (e: any) {
        console.error(e);
        setError(
          e?.message ||
            'Failed to initialize CreativeEditor SDK. Check baseURL, CSS, and license.'
        );
      }
    }

    init();
    return () => {
      disposed = true;
      if (instance) instance.dispose?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full">
      {error ? (
        <div className="text-red-400 text-sm p-4 whitespace-pre-wrap">{error}</div>
      ) : null}
      <div ref={containerRef} style={{ width: '100%', height: '80vh' }} />
    </div>
  );
};

export default ImgLyEditor;

