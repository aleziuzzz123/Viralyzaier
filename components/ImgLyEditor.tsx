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
    const licenseKey = (window as any).__env?.VITE_IMGLY_LICENSE_KEY;
    if (!licenseKey || /YOUR_IMGLY/i.test(licenseKey)) {
      addToast('VITE_IMGLY_LICENSE_KEY is not configured. Please check index.html or your env.', 'error');
      setIsLoading(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const init = async () => {
      if (editorRef.current) return;

      try {
        // Use the CE.SDK JS assets path (NOT the engine path).
        const config = {
          license: licenseKey,
          baseURL: 'https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets',
          theme: 'dark' as const,
          ui: {
            elements: {
              view: 'default' as const,
              navigation: { action: { export: true, save: false, load: false } },
              dock: { groups: [{ id: 'ly.img.video.template' }, { id: 'ly.img.default-group' }, { id: 'ly.img.video.text' }, { id: 'ly.img.video.sticker' }, { id: 'ly.img.video.audio' }] }
            }
          },
          // safest low-memory mode for broad browser support
          wasm: { disableMultithread: true, disableSIMD: true }
        };

        const editor: any = await CreativeEditorSDK.create(container, config);
        editorRef.current = editor;

        const voiceoverUrls = project.assets ? (Object.values(project.assets).map(a => a.voiceoverUrl).filter(Boolean) as string[]) : [];
        const moodboardUrls = project.moodboard || [];

        if (moodboardUrls.length || voiceoverUrls.length) {
          await editor.asset.addAssets([
            ...moodboardUrls.map((url, i) => ({ id: `moodboard_${i}`, meta: { uri: url, type: 'image' } })),
            ...voiceoverUrls.map((url, i) => ({ id: `voiceover_${i}`, meta: { uri: url, type: 'audio' } }))
          ]);
        }

        editor.on('export', async (result: any) => {
          if (isExportingRef.current) return;
          isExportingRef.current = true;
          setIsExporting(true);
          addToast('Exporting video... This may take a moment.', 'info');
          try {
            const blob = await result.toBlob();
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

    init();

    return () => {
      if (editorRef.current) {
        try { editorRef.current.dispose(); } catch {}
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



