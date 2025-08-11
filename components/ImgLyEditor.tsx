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

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
  const { user, handleFinalVideoSaved, addToast } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const isExportingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialize = async () => {
      if (editorRef.current) return;

      const licenseKey: string | undefined =
        (window as any).__env?.VITE_IMGLY_LICENSE_KEY;

      if (!licenseKey) {
        addToast('IMG.LY license key missing.', 'error');
        setIsLoading(false);
        return;
      }

      try {
        // IMPORTANT: This path must point to the engine assets exactly.
        const engineAssetsBase =
          'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0/assets';

        const editor = await CreativeEditorSDK.create(container, {
          license: licenseKey,
          baseURL: engineAssetsBase,
          theme: 'dark',
          ui: {
            elements: {
              view: 'default',
              navigation: { action: { export: true, save: false, load: false } }
            }
          },
          // Low-memory mode helps avoid WASM allocation errors on smaller devices
          wasm: { disableMultithread: true, disableSIMD: true }
        });

        editorRef.current = editor;

        // Add any preloaded assets from the project (optional)
        const voiceoverUrls =
          project.assets
            ? (Object.values(project.assets)
                .map(a => a.voiceoverUrl)
                .filter(Boolean) as string[])
            : [];
        const moodboardUrls = project.moodboard || [];

        if (moodboardUrls.length || voiceoverUrls.length) {
          await editor.asset.addAssets([
            ...moodboardUrls.map((url, i) => ({
              id: `moodboard_${i}`,
              meta: { uri: url, type: 'image' as const }
            })),
            ...voiceoverUrls.map((url, i) => ({
              id: `voiceover_${i}`,
              meta: { uri: url, type: 'audio' as const }
            }))
          ]);
        }

        // Handle export
        editor.on('export', async (result: any) => {
          if (isExportingRef.current) return;
          isExportingRef.current = true;
          setIsExporting(true);
          addToast('Exporting video…', 'info');

          try {
            const blob: Blob = await result.toBlob();
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
        console.error('CESDK init failed:', err);
        addToast(
          `Could not load the editor: ${getErrorMessage(err)}. ` +
            `If this persists, hard-refresh (Cmd/Ctrl+Shift+R).`,
          'error'
        );
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.dispose();
        } catch {}
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


