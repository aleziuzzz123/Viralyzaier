import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

// ---- configuration you likely won't need to touch ----
const PROXY_BASE = '/api/cesdk-assets';
const UI_VERSION = '1.57.0'; // keep in sync with the CE.SDK you use
const UI_CSS_URL = `${PROXY_BASE}/cesdk-ui/${UI_VERSION}/stylesheets/cesdk.css`;
// ------------------------------------------------------

function injectCss(href: string) {
  return new Promise<void>((resolve, reject) => {
    const id = 'cesdk-ui-css';
    if (document.getElementById(id)) return resolve();
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load ${href}`));
    document.head.appendChild(link);
  });
}

export default function ImgLyEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    (async () => {
      // Accept both env names (avoid confusion)
      const LICENSE =
        (import.meta as any).env.VITE_IMGLY_LICENSE_KEY ||
        (import.meta as any).env.VITE_IMG_LY_LICENSE_KEY;

      if (!LICENSE) {
        setError(
          'Missing VITE_IMGLY_LICENSE_KEY – set it in your Vercel project env vars.'
        );
        return;
      }

      // 1) Quick proxy self-test (HEAD to the proxied UI CSS)
      try {
        const head = await fetch(UI_CSS_URL, { method: 'HEAD', cache: 'no-store' });
        if (!head.ok) {
          throw new Error(
            `Proxy check failed (${head.status}). /api/cesdk-assets must return 200 for ${UI_CSS_URL}`
          );
        }
      } catch (e: any) {
        setError(
          `Could not reach /api/cesdk-assets via ${UI_CSS_URL}: ${e?.message || e}. ` +
            `Tips: 1) Vercel → Settings → Environment Variables → add VITE_IMGLY_LICENSE_KEY. ` +
            `2) Open ${UI_CSS_URL} in your browser; it must return 200.`
        );
        return;
      }

      // 2) Inject CE.SDK UI styles through the proxy
      try {
        await injectCss(UI_CSS_URL);
      } catch (e: any) {
        setError(`Failed to inject UI CSS: ${e?.message || e}`);
        return;
      }

      // 3) Create CE.SDK
      try {
        // NOTE: CE.SDK automatically resolves the engine (wasm, .data, etc.)
        // from the same CDN family; because we load CSS from our proxy, CE.SDK’s
        // internal requests to /cesdk-engine/... will also go through the proxy.
        const instance = await CreativeEditorSDK.create(containerRef.current!, {
          license: LICENSE,
          theme: 'dark',
          // Optional: If you want to be explicit, point engine to the proxy:
          // engine: { baseURL: `${PROXY_BASE}/cesdk-engine/latest/` },
          ui: {
            elements: {
              // tailor the UI to your app here if you wish
            }
          }
        });

        if (canceled) {
          // Clean up if unmounted before create() resolves
          instance?.dispose?.();
        }
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {error ? (
        <div
          style={{
            color: '#fda4af',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '12px',
            borderRadius: 8,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '80vh' }} />
      )}
    </div>
  );
}




