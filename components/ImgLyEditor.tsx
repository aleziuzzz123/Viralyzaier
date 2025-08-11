import React, { useRef, useEffect, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { Project } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { getErrorMessage } from '../utils.ts';
import * as supabaseService from '../services/supabaseService.ts';
import { v4 as uuidv4 } from 'uuid';

interface ImgLyEditorProps { project: Project; }

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
  const { user, handleFinalVideoSaved, addToast } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const exporting = useRef(false);

  useEffect(() => {
    const license = (window as any).__env?.VITE_IMGLY_LICENSE_KEY;
    if (!license || /YOUR_/i.test(license)) {
      addToast('VITE_IMGLY_LICENSE_KEY is missing/placeholder.', 'error');
      setIsLoading(false);
      return;
    }
    const el = containerRef.current;
    if (!el || editorRef.current) return;

    (async () => {
      try {
        const engineBase = 'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0/';

        const editor: any = await CreativeEditorSDK.create(el, {
          license,
          baseURL: engineBase,   // IMPORTANT: engine root, trailing slash
          theme: 'dark',
          ui: {
            elements: {
              view: 'default',
              navigation: { action: { export: true, save: false, load: false } }
            }
          },
          // Low-memory mode to avoid WASM allocation errors on some hosts.
          wasm: { disableMultithread: true, disableSIMD: true }
        });

        editorRef.current = editor;

        const voiceoverUrls = project.assets
          ? (Object.values(project.assets).map(a => a.voiceoverUrl).filter(Boolean) as string[])
          : [];
        const moodboardUrls = project.moodboard || [];

        await editor.asset.addAssets([
          ...moodboardUrls.map((url, i) => ({ id: `mood_${i}`, meta: { uri: url, type: 'image' } })),
          ...voiceoverUrls.map((url, i) => ({ id: `vo_${i}`,   meta: { uri: url, type: 'audio' } }))
        ]);

        editor.on('export', async (result: any) => {
          if (exporting.current) return;
          exporting.current = true;
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
            exporting.current = false;
            setIsExporting(false);
          }
        });

        setIsLoading(false);
      } catch (e) {
        console.error('IMG.LY init failed:', e);
        addToast(`Could not load the editor: ${getErrorMessage(e)}`, 'error');
        setIsLoading(false);
      }
    })();

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [project, addToast, handleFinalVideoSaved, user]);

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
