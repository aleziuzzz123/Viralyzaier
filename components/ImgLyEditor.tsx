// components/ImgLyEditor.tsx
import React, { useRef, useEffect, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { Project } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import * as supabaseService from '../services/supabaseService';
import { v4 as uuidv4 } from 'uuid';

interface ImgLyEditorProps {
  project: Project;
}

const CESDK_VERSION = '1.57.0';
const ENGINE_BASE = `https://cdn.img.ly/packages/imgly/cesdk-engine/${CESDK_VERSION}/`;
const CSS_CORE = `https://cdn.img.ly/packages/imgly/cesdk-js/${CESDK_VERSION}/styles/cesdk.css`;
const CSS_THEME = `https://cdn.img.ly/packages/imgly/cesdk-js/${CESDK_VERSION}/styles/cesdk-themes.css`;

async function ensureCssLoaded(href: string): Promise<void> {
  // Already there & loaded?
  const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .find(l => l.href === href);
  if (existing) return;

  await new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
    document.head.appendChild(link);
  });
}

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
  const { user, handleFinalVideoSaved, addToast } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const exportingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const licenseKey = (window as any).__env?.VITE_IMGLY_LICENSE_KEY as string | undefined;
        if (!licenseKey) {
          addToast('IMGLY license key missing. Set VITE_IMGLY_LICENSE_KEY in index.html or Vercel env.', 'error');
          setIsLoading(false);
          return;
        }
        const node = containerRef.current;
        if (!node) return;

        // 1) Make sure the stylesheets are present before initializing SDK
        await ensureCssLoaded(CSS_CORE);
        await ensureCssLoaded(CSS_THEME);

        // 2) Avoid double init
        if (editorRef.current) {
          setIsLoading(false);
          return;
        }

        const config = {
          license: licenseKey,
          baseURL: ENGINE_BASE,
          theme: 'dark' as const,
          ui: {
            elements: {
              view: 'default',
              navigation: { action: { export: true, save: false, load: false } }
            }
          },
          // Memory-friendly WASM settings
          wasm: { disableMultithread: true, disableSIMD: true }
        };

        const editor = await CreativeEditorSDK.create(node, config);
        if (cancelled) return;
        editorRef.current = editor;

        // (Optional) add available assets (guard older builds)
        try {
          const voiceoverUrls = project.assets ? Object.values(project.assets)
            .map(a => a.voiceoverUrl)
            .filter(Boolean) as string[] : [];
          const moodboardUrls = project.moodboard || [];

          // Default sources if supported
          if (typeof editor.addDefaultAssetSources === 'function') {
            await editor.addDefaultAssetSources();
          }

          const assetApi = (editor as any).asset;
          if (assetApi && typeof assetApi.addAssets === 'function') {
            await assetApi.addAssets([
              ...moodboardUrls.map((url, i) => ({ id: `mood_${i}`, meta: { uri: url, type: 'image' } })),
              ...voiceoverUrls.map((url, i) => ({ id: `voice_${i}`, meta: { uri: url, type: 'audio' } }))
            ]);
          }
        } catch (e) {
          // Non-fatal: just log
          console.warn('Adding assets skipped:', e);
        }

        // Export hook
        editor.on('export', async (result: any) => {
          if (exportingRef.current) return;
          exportingRef.current = true;
          setIsExporting(true);
          addToast('Exporting video…', 'info');
          try {
            const blob = await result.toBlob();
            const path = `${user!.id}/${project.id}/final_${uuidv4()}.mp4`;
            const publicUrl = await supabaseService.uploadFile(blob, path);
            await handleFinalVideoSaved(project.id, publicUrl);
          } catch (err) {
            addToast(`Export failed: ${getErrorMessage(err)}`, 'error');
          } finally {
            exportingRef.current = false;
            setIsExporting(false);
          }
        });

        setIsLoading(false);
      } catch (err: any) {
        console.error('CESDK init failed:', err);
        const msg = err?.message || String(err);
        // Common theme/CSS error message
        if (msg.toLowerCase().includes('theme') || msg.toLowerCase().includes('css')) {
          addToast('Could not load the editor: Failed to read theme variables. Try a hard refresh (Cmd/Ctrl+Shift+R) and ensure cdn.img.ly is not blocked by extensions.', 'error');
        } else {
          addToast(`Could not load the editor: ${getErrorMessage(err)}`, 'error');
        }
        setIsLoading(false);
      }
    };

    boot();
    return () => { cancelled = true; editorRef.current?.dispose?.(); editorRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]); // re-init only when switching projects

  return (
    <div className="w-full h-[calc(100vh-12rem)] relative rounded-2xl overflow-hidden shadow-2xl bg-gray-950 border border-indigo-500/20">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 z-10 flex items-center justify-center">
          <p className="text-white">Initializing Creative Studio…</p>
        </div>
      )}
      {isExporting && (
        <div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-xl font-bold">Rendering Your Video…</p>
            <p className="text-gray-300">Please keep this window open.</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ImgLyEditor;


