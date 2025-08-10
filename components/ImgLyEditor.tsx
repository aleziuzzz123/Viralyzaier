
import React, { useRef, useEffect, useState } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { Project } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { getErrorMessage } from '../utils.ts';
import * as supabaseService from '../services/supabaseService.ts';
import { v4 as uuidv4 } from 'uuid';
import { WarningIcon } from './Icons.tsx';

interface ImgLyEditorProps {
    project: Project;
}

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
    const { user, handleFinalVideoSaved, addToast } = useAppContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const isExportingRef = useRef(false);
    const [isIsolated, setIsIsolated] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsIsolated(window.crossOriginIsolated);
        }
    }, []);

    useEffect(() => {
        if (!isIsolated) {
            setIsLoading(false);
            return;
        }

        const licenseKey = (window as any).__env?.VITE_IMGLY_LICENSE_KEY;
        if (!licenseKey || licenseKey.includes('YOUR_IMGLY')) {
            addToast("VITE_IMGLY_LICENSE_KEY is not configured. Please check your index.html file.", 'error');
            setIsLoading(false);
            return;
        }

        const container = containerRef.current;
        if (!container) return;
        
        let editorInstance: any = null;

        const initializeEditor = async () => {
            try {
                const voiceoverUrls = project.assets ? Object.values(project.assets).map(a => a.voiceoverUrl).filter(Boolean) as string[] : [];
                const moodboardUrls = project.moodboard || [];
                
                editorInstance = await CreativeEditorSDK.create(container, {
                    license: licenseKey,
                    baseURL: 'https://cdn.img.ly/packages/imgly/cesdk-engine/1.57.0/assets',
                    theme: 'dark',
                    ui: {
                        elements: {
                            view: 'default',
                            navigation: {
                                action: { export: true, save: false, load: false }
                            },
                            dock: {
                                groups: [
                                    { id: 'ly.img.video.template' },
                                    { id: 'ly.img.default-group' },
                                    { id: 'ly.img.video.text' },
                                    { id: 'ly.img.video.sticker' },
                                    { id: 'ly.img.video.audio' },
                                ]
                            },
                        },
                    },
                    assets: {
                        entries: [
                            ...moodboardUrls.map((url, i) => ({ id: `moodboard_${i}`, meta: { uri: url, type: 'video' } })),
                            ...voiceoverUrls.map((url, i) => ({ id: `voiceover_${i}`, meta: { uri: url, type: 'audio' } })),
                        ],
                    },
                });

                editorInstance.on('export', async (result: any) => {
                    if (isExportingRef.current) return;
                    isExportingRef.current = true;
                    setIsExporting(true);
                    addToast("Exporting video... This may take a moment.", 'info');
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
                console.error("Failed to initialize IMG.LY Editor:", err);
                addToast(`Could not load the editor: ${getErrorMessage(err)}`, 'error');
                setIsLoading(false);
            }
        };

        initializeEditor();

        return () => {
            if (editorInstance) {
                editorInstance.dispose();
            }
        };
    }, [isIsolated, project, user, handleFinalVideoSaved, addToast]);

    if (!isIsolated && !isLoading) {
        return (
            <div className="w-full h-[calc(100vh-12rem)] relative rounded-2xl overflow-hidden shadow-2xl bg-amber-900/20 border border-amber-500/50 flex flex-col items-center justify-center text-center p-8">
                <WarningIcon className="w-16 h-16 text-amber-400 mb-4" />
                <h3 className="text-2xl font-bold text-white">Editor Unavailable in Preview</h3>
                <p className="mt-2 text-amber-200 max-w-md">
                    The high-performance Creative Studio cannot run inside this sandboxed preview environment due to security restrictions.
                </p>
                <p className="mt-4 text-sm text-amber-300">
                    Please open the application in a new tab or on your deployed site to use the editor.
                </p>
            </div>
        );
    }

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
