
import React, { useRef, useEffect, useState } from 'react';
import { Project } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { getErrorMessage } from '../utils.ts';
import * as supabaseService from '../services/supabaseService.ts';
import { v4 as uuidv4 } from 'uuid';

declare const Editor: any;

interface ImgLyEditorProps {
    project: Project;
}

const ImgLyEditor: React.FC<ImgLyEditorProps> = ({ project }) => {
    const { user, handleFinalVideoSaved, addToast } = useAppContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

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
                // Pre-fetch voiceovers and moodboard assets
                const voiceoverUrls = project.assets ? Object.values(project.assets).map(a => a.voiceoverUrl).filter(Boolean) as string[] : [];
                const moodboardUrls = project.moodboard || [];

                editor = await Editor.create(container, {
                    license: licenseKey,
                    ui: {
                        elements: {
                            navigation: {
                                action: {
                                    export: true,
                                    save: false,
                                    load: false,
                                }
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
                        // Pre-load all generated assets into the editor's library
                        entries: [
                            ...moodboardUrls.map((url, i) => ({
                                id: `moodboard_${i}`,
                                meta: { uri: url, type: 'video' },
                            })),
                            ...voiceoverUrls.map((url, i) => ({
                                id: `voiceover_${i}`,
                                meta: { uri: url, type: 'audio' },
                            })),
                        ],
                    },
                });

                editorRef.current = editor;

                // Handle the export event
                editor.on('export', async (result: any) => {
                    if (isExporting) return;
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
                        setIsExporting(false);
                    }
                });
                
                setIsLoading(false);

            } catch (err) {
                console.error("Failed to initialize IMG.LY Editor:", err);
                addToast(`Could not load the editor: ${getErrorMessage(err)}`, 'error');
            }
        };

        const pollForEditor = () => {
            const intervalId = setInterval(() => {
                if (typeof Editor !== 'undefined') {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    initEditor();
                }
            }, 100);

            const timeoutId = setTimeout(() => {
                clearInterval(intervalId);
                if (!editorRef.current) {
                    addToast("Failed to load editor SDK. Please check your internet connection and refresh.", "error");
                    setIsLoading(false);
                }
            }, 15000); // 15-second timeout for the SDK to load
        };

        pollForEditor();

        return () => {
            if (editorRef.current) {
                try {
                    editorRef.current.destroy();
                } catch (e) {
                    console.warn("Could not cleanly destroy editor instance:", e);
                } finally {
                    editorRef.current = null;
                }
            }
        };
    }, [project.id]);

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
