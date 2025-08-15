import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

function injectCssOnce(href: string, id: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement('link');
  el.id = id;
  el.rel = 'stylesheet';
  el.href = href;
  document.head.appendChild(el);
}

const CDN = 'https://cdn.img.ly/packages/imgly';
const ENGINE_BASE = `${CDN}/cesdk-engine/latest`;
const UI_BASE = `${CDN}/cesdk-ui/latest`;

export default function ImgLyEditor() {
  const container = useRef<HTMLDivElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Load UI styles from the CDN
        injectCssOnce(`${UI_BASE}/stylesheets/cesdk.css`, 'cesdk-css');
        injectCssOnce(`${UI_BASE}/stylesheets/cesdk-themes.css`, 'cesdk-themes-css');

        const license = import.meta.env.VITE_IMGLY_LICENSE_KEY;
        if (!license) {
          setErr('Missing IMG.LY license key (VITE_IMGLY_LICENSE_KEY).');
          return;
        }

        // Tell the engine exactly where its wasm/data live (CDN)
        const sdk = await (CreativeEditorSDK as any).create(container.current!, {
          license,
          theme: 'dark',
          baseURL: ENGINE_BASE,          // some versions read this
          engine: { baseURL: ENGINE_BASE } // others read this - keep both for safety
        });

        // Optional: if your version supports it
        // await (sdk as any).addDefaultAssetSources?.();

      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  return (
    <div className="h-[75vh]">
      {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
      <div ref={container} className="w-full h-full" />
    </div>
  );
}

