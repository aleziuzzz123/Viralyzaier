// components/ImgLyEditor.tsx
import { useEffect, useRef, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

type Props = {
  className?: string;
};

const CESDK_VERSION = '1.57.0';

// UI stylesheets served through your proxy (must be reachable with HTTP 200)
const UI_CSS = [
  `/api/cesdk-assets/cesdk-ui/${CESDK_VERSION}/stylesheets/cesdk.css`,
  `/api/cesdk-assets/cesdk-ui/${CESDK_VERSION}/stylesheets/cesdk-themes.css`,
];

// Base URLs the SDK uses to pull more assets at runtime.
// We pin to a concrete version to avoid 404s on “latest”.
const UI_BASE_URL = `/api/cesdk-assets/cesdk-ui/${CESDK_VERSION}`;
const ENGINE_BASE_URL = `/api/cesdk-assets/cesdk-engine/${CESDK_VERSION}`;

// Inject a <link> tag once for a given href.
function injectCssOnce(href: string) {
  if (typeof document === 'undefined') return; // SSR guard
  const id = `cesdk-css-${href}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export default function ImgLyEditor({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    let instance: any | null = null;

    async function init() {
      try {
        setError(null);

        // 1) License (support both names; prefer the correct one)
        const LICENSE =
          import.meta.env.VITE_IMG_LY_LICENSE_KEY ??
          import.meta.env.VITE_IMGLY_LICENSE_KEY;

        if (!LICENSE) {
          throw new Error(
            'Missing VITE_IMG_LY_LICENSE_KEY – set it in your Vercel project env vars.'
          );
        }

        // 2) Ensure our UI CSS is present (so the editor doesn't “flash” unstyled)
        UI_CSS.forEach(injectCssOnce);

        // 3) Very quick reachability sanity check for your proxy (first CSS file)
        try {
          const ping = await fetch(UI_CSS[0], { method: 'HEAD' });
          if (!ping.ok) {
            throw new Error(
              `Proxy check failed (${ping.status}). /api/cesdk-assets must return 200.`
            );
          }
        } catch (e: any) {
          throw new Error(
            `Could not reach /api/cesdk-assets via ${UI_CSS[0]}: ${e?.message || e}`
          );
        }

        if (!containerRef.current) return;

        // 4) Create the editor
        instance = await CreativeEditorSDK.create(containerRef.current, {
          license: LICENSE,
          // Where the SDK loads additional UI files (icons, locales, etc.)
          baseURL: UI_BASE_URL,
          // Where the engine (WASM + data) is fetched from.
          // Newer CESDK builds discover engine next to the UI path.
          // Supplying both eliminates “latest” lookups and avoids 404s.
          engine: {
            baseURL: ENGINE_BASE_URL,
          },
          // Optional: set a template scene to prove it boots
          // initialSceneURL: `${UI_BASE_URL}/examples/cesdk_banner.scene`,
          // Optional: theme
          theme: 'dark',
        });

        // Example: ensure we have a page
        const engine = instance.engine;
        if (engine && engine.scene && engine.scene.get()) {
          // scene already present
        } else if (engine) {
          await engine.scene.create();
        }
      } catch (err: any) {
        console.error(err);
        if (!destroyed) {
          setError(
            String(
              err?.message ||
                err ||
                'Editor engine could not be loaded (unknown error).'
            )
          );
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      try {
        // Dispose editor on unmount
        // @ts-expect-error CESDK exposes `dispose` on the instance
        (instance?.dispose || instance?.destroy)?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      {/* Error banner (visible only if something is wrong) */}
      {error ? (
        <div
          style={{
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI',
            background: '#2a2a2a',
            color: '#ffb4b4',
            padding: '10px 14px',
            borderRadius: 8,
            margin: '12px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
          {'\n'}
          Tips:
          {' '}
          1) Vercel → Settings → Environment Variables → add
          {' '}
          <code>VITE_IMG_LY_LICENSE_KEY</code>.
          {' '}
          2) Open
          {' '}
          <code>{UI_CSS[0]}</code>
          {' '}
          in your browser; it must return 200.
        </div>
      ) : null}

      {/* The editor mounts here */}
      <div
        ref={containerRef}
        id="cesdk-container"
        style={{
          width: '100%',
          height: 'calc(100% - 0px)',
          minHeight: 540,
        }}
      />
    </div>
  );
}



