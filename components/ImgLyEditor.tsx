import React, { useRef, useEffect, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { Project } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { getErrorMessage } from '../utils.ts';
import * as supabaseService from '../services/supabaseService.ts';
import { v4 as uuidv4 } from 'uuid';

interface ImgLyEditorProps {
  project: Project;
}

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
  const { user, handleFinalVideoSaved, addToast } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const isExportingRef = useRef(false);

  useEffect(() => {
    const licenseKey = (window as any).__env?.VITE_IMGLY_LICENSE_KEY;
    if (!licenseKey || typeof licenseKey !== 'string' || !licenseKey.trim()) {
      addToast(
        'VITE_IMGLY_LICENSE_KEY is not configured. Please check your index.html or your hosting env vars.',
        'error'
      );
      setIsLoading(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const initializeEditor = async () => {
      // prevent double init
      if (editorRef.current) return;

      try {
        const engineBase = 'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0/';
        const editor = await CreativeEditorSDK.create(container, {
          license: licenseKey,
          baseURL: engineBase,
          theme: 'dark' as const,
          ui: {
            elements: {
              view: 'default',
              navigation: { action: { export: true, save: false, load: false } }
            }
          },
          // safer defaults for widest browser support
          wasm: { disableMultithread: true, disableSIMD: true }
        });

        editorRef.current = editor;

        // Safely try to register assets (API names can vary across CESDK versions)
        try {
          const voiceoverUrls =
            project.assets
              ? (Object.values(project.assets)
                  .map((a) => a?.voiceoverUrl)
                  .filter(Boolean) as string[])
              : [];
          const moodboardUrls = project.moodboard || [];

          const hasBulkAdd =
            editor?.asset && typeof editor.asset.addAssets === 'function';
          const hasSingleAdd =
            editor?.asset && typeof editor.asset.addAsset === 'function';

          if (hasBulkAdd) {
            await editor.asset.addAssets([
              ...moodboardUrls.map((url: string, i: number) => ({
                id: `moodboard_${i}`,
                meta: { uri: url, type: 'image' }
              })),
              ...voiceoverUrls.map((url: string, i: number) => ({
                id: `voiceover_${i}`,
                meta: { uri: url, type: 'audio' }
              }))
            ]);
          } else if (hasSingleAdd) {
            for (let i = 0; i < moodboardUrls.length; i++) {
              await editor.asset.addAsset({
                id: `moodboard_${i}`,
                meta: { uri: moodboardUrls[i], type: 'image' }
              });
            }
            for (let i = 0; i < voiceoverUrls.length; i++) {
              await editor.asset.addAsset({
                id: `voiceover_${i}`,
                meta: { uri: voiceoverUrls[i], type: 'audio' }
              });
            }
          } else {
            // No asset API available (older/newer CESDK builds) – editor still usable.
            console.warn(
              '[ImgLyEditor] Asset API not available on this CESDK build; skipping asset pre-load.'
            );
          }
        } catch (assetErr) {
          // Don’t block the editor; just log a warning.
          console.warn('[ImgLyEditor] Skipped asset preload:', assetErr);
        }

        // Handle export -> upload to Supabase
        editor.on('export', async (result: any) => {
          if (isExportingRef.current) return;
          isExportingRef.current = true;
          setIsExporting(true);
          addToast('Exporting video... This may take a moment.', 'info');

          try {
            const blob =
              typeof result?.toBlob === 'function'
                ? await result.toBlob()
                : result instanceof Blob
                ? result
                : null;

            if (!blob) {
              throw new Error(
                'Editor returned no blob. Please try exporting again.'
              );
            }

            const path = `${user!.id}/${project.id}/final_video_${uuidv4()}.mp4`;
            const publicUrl = await supabaseService.uploadFile(blob, path);
            await handleFinalVideoSaved(project.id, publicUrl);
          } catch (err) {
            addToast(`Export failed: ${getErrorMessage(err)}`, 'error');
          } finally {
            isExportingRef.current = false;
            setIsExporting(false);
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize IMG.LY Editor:', err);
        addToast(`Could not load the editor: ${getErrorMessage(err)}`, 'error');
        setIsLoading(false);
      }
    };

    initializeEditor();

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.dispose?.();
        } catch {}
        editorRef.current = null;
      }
    };
  }, [project, user, handleFinalVideoSaved, addToast]);

  return (
    <div className="w-full h-[calc(100vh-12rem)] relative rounded-2xl overflow-hidden shadow-2xl bg-gray-950 border border-indigo-500/20">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 z-10 flex items-center justify-center">
          <p className="text-white">Initializing Creative Studio...</p>
        </div>
      )}
      {isExporting && (
        <div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-xl font-bold">Rendering Your Video...</p>
            <p className="text-gray-300">Please keep this window open.</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ImgLyEditor;


