import React, { useRef, useEffect, useState } from 'react';
import { Project } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import * as supabaseService from '../services/supabaseService';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    CreativeEditorSDK: any;
    __env?: Record<string, any>;
  }
}

interface ImgLyEditorProps {
  project: Project;
}

const CESDK_ENGINE_BASE = 'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0/assets/';

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
  const { user, handleFinalVideoSaved, addToast } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const exportingFlag = useRef(false);

  useEffect(() => {
    const licenseKey = window.__env?.VITE_IMGLY_LICENSE_KEY;
    if (!licenseKey || /YOUR_IMGLY/i.test(licenseKey)) {
      addToast('VITE_IMGLY_LICENSE_KEY is missing/placeholder.', 'error');
      setIsLoading(false);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    let disposed = false;

    (async () => {
      try {
        const sdk = window.CreativeEditorSDK;
        if (!sdk) {
          addToast('IMG.LY SDK not found on window. Check index.html script tag.', 'error');
          setIsLoading(false);
          return;
        }

        // Avoid double init
        if (editorRef.current) {
          setIsLoading(false);
          return;
        }

        // Create editor
        const editor = await sdk.create(el, {
          license: licenseKey,
          baseURL: CESDK_ENGINE_BASE, // MUST end with /assets/
          theme: 'dark',
          ui: {
            elements: {
              view: 'default',
              navigation: { action: { export: true, save: false, load: false } }
            }
          },
          // Memory-friendly WASM settings (no threads/SIMD)
          wasm: { disableMultithread: true, disableSIMD: true }
        });

        if (disposed) {
          editor.dispose?.();
          return;
        }

        editorRef.current = editor;

        // Wait a tick before touching the asset API
        await new Promise(r => setTimeout(r, 200));

        const voiceovers = project.assets
          ? (Object.values(project.assets).map(a => a.voiceoverUrl).filter(Boolean) as string[])
          : [];
        const moodboard = project.moodboard || [];

        // Not all builds expose asset API the same way; guard it.
        const addAssets = editor?.asset?.addAssets?.bind(editor.asset);
        if (addAssets) {
          await addAssets([
            ...moodboard.map((url, i) => ({ id: `mood_${i}`, meta: { uri: url, type: 'image' } })),
            ...voiceovers.map((url, i) => ({ id: `vo_${i}`, meta: { uri: url, type: 'audio' } }))
          ]);
        }

        // Export handling
        editor.on?.('export', async (result: any) => {
          if (exportingFlag.current) return;
          exportingFlag.current = true;
          setIsExporting(true);
          addToast('Exporting video…', 'info');

          try {
            const blob = await result.toBlob();
            const path = `${user!.id}/${project.id}/final_${uuidv4()}.mp4`;
            const publicUrl = await supabaseService.uploadFile(blob, path);
            await handleFinalVideoSaved(project.id, publicUrl);
          } catch (e) {
            addToast(`Export failed: ${getErrorMessage(e)}`, 'error');
          } finally {
            setIsExporting(false);
            exportingFlag.current = false;
          }
        });

        setIsLoading(false);
      } catch (e) {
        console.error(e);
        addToast(`Could not load the editor: ${getErrorMessage(e)}`, 'error');
        setIsLoading(false);
      }
    })();

    return () => {
      disposed = true;
      try {
        editorRef.current?.dispose?.();
      } finally {
        editorRef.current = null;
      }
    };
  }, [project, user, addToast, handleFinalVideoSaved]);

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


