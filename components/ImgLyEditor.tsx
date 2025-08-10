
import React, { useRef, useEffect, useState } from 'react';
import CreativeEditorSDK from '@imgly/cesdk-js';
import '@imgly/cesdk-js/index.css';
import { Project } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { getErrorMessage, parseTimecode } from '../utils.ts';
import * as supabaseService from '../services/supabaseService.ts';
import { v4 as uuidv4 } from 'uuid';

interface ImgLyEditorProps {
    project: Project;
}

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
    const { user, handleFinalVideoSaved, addToast } = useAppContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [editorInstance, setEditorInstance] = useState<any>(null);

    useEffect(() => {
        const licenseKey = (window as any).__env?.VITE_IMGLY_LICENSE_KEY;
        if (!licenseKey || licenseKey.includes('YOUR_IMGLY')) {
            throw new Error("VITE_IMGLY_LICENSE_KEY is not configured. Please check your index.html file.");
        }

        const container = containerRef.current;
        if (!container) return;

        let editor: any;
        const initEditor = async () => {
            try {
                editor = await CreativeEditorSDK.create(container, {
                    license: licenseKey,
                    baseURL: 'https://cdn.img.ly/packages/imgly/cesdk-js/1.17.0/assets',
                    theme: 'dark',
                    ui: {
                        elements: {
                            navigation: {
                                action: { export: true, save: false, load: false }
                            },
                            panels: {
                                settings: true
                            },
                             page: {
                                mode: 'video'
                            }
                        }
                    }
                });
                
                setEditorInstance(editor);
                setIsLoading(false);

            } catch (err) {
                console.error("Failed to initialize IMG.LY Editor:", err);
                addToast(`Could not load the editor: ${getErrorMessage(err)}`, 'error');
                setIsLoading(false);
            }
        };

        initEditor();

        return () => {
            if (editor) {
                try { editor.dispose(); } catch (e) { console.warn("Could not cleanly destroy editor instance:", e); }
            }
        };
    }, []);

     // Effect for loading assets and handling export events
    useEffect(() => {
        if (!editorInstance) return;

        const loadAssetsAndScript = async () => {
            try {
                // Pre-load all generated assets into the editor's library
                const voiceoverUrls = project.assets ? Object.values(project.assets).map(a => a.voiceoverUrl).filter(Boolean) as string[] : [];
                const moodboardUrls = project.moodboard || [];
                
                const assetsToLoad = [
                    ...moodboardUrls.map((url, i) => ({ id: `moodboard_${i}`, meta: { uri: url, type: 'video' } })),
                    ...voiceoverUrls.map((url, i) => ({ id: `voiceover_${i}`, meta: { uri: url, type: 'audio' } }))
                ];
                
                if (assetsToLoad.length > 0) {
                     await editorInstance.addDefaultAssetSources();
                     await editorInstance.addAssetSources({ id: 'viralyzer_assets', findAssets: () => Promise.resolve({ assets: assetsToLoad }) });
                }
                
                // AI Co-Director: Automatically build the timeline from the script
                if (project.script) {
                    const scene = editorInstance.scene.get();
                    for (const scriptScene of project.script.scenes) {
                        if (scriptScene.onScreenText) {
                            const timing = parseTimecode(scriptScene.timecode);
                            if (timing) {
                                const text = editorInstance.block.create('text');
                                editorInstance.block.setString(text, 'text/text', scriptScene.onScreenText);
                                editorInstance.block.setFloat(text, 'text/fontSize', 80);
                                editorInstance.block.setFill(text, 'fill/solid/color', { r: 1, g: 1, b: 1 });
                                editorInstance.block.setFrame(text, {
                                    startTime: timing.start,
                                    duration: timing.duration,
                                });
                                editorInstance.block.appendChild(scene, text);
                            }
                        }
                    }
                }

            } catch (err) {
                console.error("Error loading assets or script into editor:", err);
                addToast(`Could not prepare editor assets: ${getErrorMessage(err)}`, 'error');
            }
        };

        loadAssetsAndScript();
        
        const exportSubscription = editorInstance.on('export', async () => {
            if (isExporting) return;
            setIsExporting(true);
            addToast("Exporting video... This may take a moment.", 'info');
            try {
                const blob = await editorInstance.export.getBlob('video/mp4');
                const path = `${user!.id}/${project.id}/final_video_${uuidv4()}.mp4`;
                const publicUrl = await supabaseService.uploadFile(blob, path);
                await handleFinalVideoSaved(project.id, publicUrl);
            } catch (err) {
                addToast(`Export failed: ${getErrorMessage(err)}`, 'error');
            } finally {
                setIsExporting(false);
            }
        });

        return () => {
            exportSubscription.unsubscribe();
        };

    }, [editorInstance, project, user, handleFinalVideoSaved, addToast]);

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