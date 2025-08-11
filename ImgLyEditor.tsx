import React, { useRef, useEffect, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { Project } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { getErrorMessage } from '../utils';
import * as supabaseService from '../services/supabaseService';
import { v4 as uuidv4 } from 'uuid';
import { addSupabaseAssetsToCESDK, uploadToSupabase } from './cesdkSupabaseSource';

interface ImgLyEditorProps { project: Project; }

const CESDK_VERSION = '1.57.0';
const ENGINE_BASE = `https://cdn.img.ly/packages/imgly/cesdk-engine/${CESDK_VERSION}/`;

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
  const { user, handleFinalVideoSaved, addToast } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportingRef = useRef(false);

  useEffect(() => {
    let editor: any;

    const boot = async () => {
      try {
        const licenseKey = (window as any).__env?.VITE_IMGLY_LICENSE_KEY as string | undefined;
        if (!licenseKey) { addToast('IMGLY license key missing. Set VITE_IMGLY_LICENSE_KEY.', 'error'); setIsLoading(false); return; }
        const node = containerRef.current; if (!node) return;

        if (editorRef.current) { setIsLoading(false); return; }

        const config = {
          license: licenseKey,
          baseURL: ENGINE_BASE,
          theme: 'dark' as const,
          ui: { elements: { view: 'default' as const, navigation: { action: { export: true, save: false, load: false }}}},
          wasm: { disableMultithread: true, disableSIMD: true } // low-mem mode
        };

        editor = await CreativeEditorSDK.create(node, config);
        editorRef.current = editor;

        try { if (typeof editor.addDefaultAssetSources === 'function') await editor.addDefaultAssetSources(); } catch (_) {}

        try { await addSupabaseAssetsToCESDK(editor, ''); } catch (e) { console.warn('Supabase asset listing failed:', e); }

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
        if (msg.toLowerCase().includes('theme')) {
          addToast('Could not load the editor: Failed to read theme variables. Hard refresh (Cmd/Ctrl+Shift+R) and ensure cdn.img.ly isn’t blocked.', 'error');
        } else {
          addToast(`Could not load the editor: ${getErrorMessage(err)}`, 'error');
        }
        setIsLoading(false);
      }
    };

    boot();
    
    return () => { 
        if(editorRef.current) {
            editorRef.current.dispose();
            editorRef.current = null;
        }
    };
    // re-init on project switch only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handlePickFile = () => fileInputRef.current?.click();
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    setUploading(true);
    try {
      const { url } = await uploadToSupabase(file, user.id, 'uploads');
      const kind = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
      if (editorRef.current?.asset?.addAssets) {
        await editorRef.current.asset.addAssets([{ id: `new_${Date.now()}`, meta: { uri: url, type: kind as any, title: file.name } }]);
      }
      addToast('Uploaded and added to library!', 'success');
    } catch (err) {
      addToast(`Upload failed: ${getErrorMessage(err)}`, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full h-[calc(100vh-12rem)] relative rounded-2xl overflow-hidden shadow-2xl bg-gray-950 border border-indigo-500/20">
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button onClick={handlePickFile} className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50" disabled={isLoading || uploading} title="Upload media (≤ 10 MB) to your library">
          {uploading ? 'Uploading…' : 'Upload to Library'}
        </button>
        <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,image/*,audio/*" className="hidden" onChange={handleUpload} />
      </div>

      {isLoading && (<div className="absolute inset-0 bg-gray-900 z-10 flex items-center justify-center"><p className="text-white">Initializing Creative Studio…</p></div>)}
      {isExporting && (<div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center"><div className="text-center"><p className="text-white text-xl font-bold">Rendering Your Video…</p><p className="text-gray-300">Please keep this window open.</p></div></div>)}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ImgLyEditor;