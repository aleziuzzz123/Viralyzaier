import React, { useState, useEffect, useRef } from 'react';
import { Project, Script, Scene } from '../types.ts';
import { CheckBadgeIcon, MagicWandIcon, SparklesIcon, PlusIcon, TrashIcon, CheckCircleIcon, PhotoIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';
import { rewriteScriptScene, generateStoryboardImage } from '../services/geminiService.ts';
import { getErrorMessage } from '../utils.ts';

interface ScriptEditorProps {
    project: Project;
    onScriptSaved: (script: Script) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ project, onScriptSaved }) => {
    const { t, consumeCredits, lockAndExecute, addToast } = useAppContext();
    const [script, setScript] = useState<Script | null>(project.script);
    const [activeCopilot, setActiveCopilot] = useState<number | null>(null);
    const [isRewriting, setIsRewriting] = useState(false);
    const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState<number | null>(null);
    const copilotRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setScript(project.script);
    }, [project.script]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (copilotRef.current && !copilotRef.current.contains(event.target as Node)) {
                setActiveCopilot(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleScriptChange = (
        type: 'hook' | 'scene' | 'cta',
        index: number,
        field: 'visual' | 'voiceover' | 'onScreenText' | 'storyboardImageUrl',
        value: string
    ) => {
        if (!script) return;

        const newScript = { ...script };
        if (type === 'hook') {
            const newHooks = [...newScript.hooks];
            newHooks[index] = value;
            newScript.hooks = newHooks;
        } else if (type === 'cta') {
            newScript.cta = value;
        } else if (type === 'scene') {
            (newScript.scenes[index] as any)[field] = value;
        }
        setScript(newScript);
    };
    
    const handleSelectHook = (index: number) => {
        if (!script) return;
        setScript({ ...script, selectedHookIndex: index });
    };
    
    const addHook = () => {
        if (!script) return;
        const newHooks = [...script.hooks, ''];
        setScript({ ...script, hooks: newHooks });
    };

    const removeHook = (index: number) => {
        if (!script || script.hooks.length <= 1) return;
        const newHooks = script.hooks.filter((_: string, i: number) => i !== index);
        const newSelectedHookIndex = script.selectedHookIndex === index 
            ? 0 
            : (script.selectedHookIndex && script.selectedHookIndex > index ? script.selectedHookIndex - 1 : script.selectedHookIndex);
        setScript({ ...script, hooks: newHooks, selectedHookIndex: newSelectedHookIndex });
    };

    const handleCopilotAction = async (sceneIndex: number, action: string) => {
        if (!script) return;
        if (!await consumeCredits(1)) return;

        setIsRewriting(true);
        setActiveCopilot(null);
        try {
            const originalScene = script.scenes[sceneIndex];
            const rewrittenScene = await rewriteScriptScene(originalScene, action);

            const newScript = { ...script };
            newScript.scenes[sceneIndex] = { ...originalScene, ...rewrittenScene };
            setScript(newScript);
        } catch (e) {
            console.error("Co-writer failed:", e);
        } finally {
            setIsRewriting(false);
        }
    };

    const handleGenerateStoryboard = (sceneIndex: number) => lockAndExecute(async () => {
        if (!script || !await consumeCredits(1)) return;
        const visualDescription = script.scenes[sceneIndex].visual;
        if (!visualDescription) {
            addToast("Please write a visual description for the scene first.", "error");
            return;
        }

        setIsGeneratingStoryboard(sceneIndex);
        try {
            const imageUrl = await generateStoryboardImage(visualDescription);
            handleScriptChange('scene', sceneIndex, 'storyboardImageUrl', imageUrl);
        } catch (e) {
            addToast(`Storyboard generation failed: ${getErrorMessage(e)}`, 'error');
        } finally {
            setIsGeneratingStoryboard(null);
        }
    });

    const handleSave = () => {
        if (script) {
            onScriptSaved(script);
        }
    };

    if (!project.script) {
        return (
             <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('script_editor.blueprint_required_title')}</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('script_editor.blueprint_required_subtitle')}</p>
            </div>
        )
    }
    
    const copilotActions = [
        { key: 'action_concise', label: t('script_editor.copilot.action_concise') },
        { key: 'action_engaging', label: t('script_editor.copilot.action_engaging') },
        { key: 'action_visual', label: t('script_editor.copilot.action_visual') }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('script_editor.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('script_editor.subtitle')}</p>
            </header>

            <div className="bg-gray-900/40 p-8 rounded-2xl space-y-8">
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2">{t('script_generator.hooks_title')}</h4>
                     <div className="space-y-3">
                        {script?.hooks.map((hook: string, index: number) => (
                            <div key={index} className={`flex items-center gap-3 p-1 rounded-lg border transition-all ${script.selectedHookIndex === index ? 'bg-indigo-900/30 border-indigo-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                <button 
                                    onClick={() => handleSelectHook(index)}
                                    className={`p-2 rounded-md ${script.selectedHookIndex === index ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}
                                    title="Select this hook"
                                >
                                    {script.selectedHookIndex === index ? <CheckCircleIcon className="w-5 h-5"/> : <div className="w-5 h-5 border-2 border-current rounded-full" />}
                                </button>
                                <input
                                    type="text"
                                    value={hook}
                                    onChange={e => handleScriptChange('hook', index, 'visual', e.target.value)}
                                    placeholder={`Hook option ${index + 1}`}
                                    className="w-full bg-transparent text-gray-300 focus:outline-none"
                                />
                                {script.hooks.length > 1 && (
                                    <button onClick={() => removeHook(index)} className="p-1 text-gray-500 hover:text-red-400">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={addHook} className="flex items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300 mt-2">
                            <PlusIcon className="w-4 h-4" /> Add Hook Option
                        </button>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2">{t('script_generator.script_title')}</h4>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
                        {script?.scenes.map((scene: Scene, i: number) => (
                            <div key={i} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-gray-200">Scene {i+1} ({scene.timecode})</p>
                                    <div className="relative" ref={activeCopilot === i ? copilotRef : null}>
                                        <button onClick={() => setActiveCopilot(activeCopilot === i ? null : i)} disabled={isRewriting} className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                                            {isRewriting ? <SparklesIcon className="w-5 h-5 animate-pulse"/> : <MagicWandIcon className="w-5 h-5"/>}
                                        </button>
                                        {activeCopilot === i && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-10 p-2">
                                                <p className="text-xs font-bold text-indigo-300 px-2 py-1">{t('script_editor.copilot.title')}</p>
                                                {copilotActions.map(action => (
                                                     <button key={action.key} onClick={() => handleCopilotAction(i, action.label)} className="w-full text-left px-2 py-1.5 text-sm text-gray-200 rounded-md hover:bg-gray-700">
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        {scene.storyboardImageUrl || isGeneratingStoryboard === i ? (
                                            <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
                                                {isGeneratingStoryboard === i 
                                                    ? <SparklesIcon className="w-8 h-8 text-indigo-400 animate-pulse"/> 
                                                    : <img src={scene.storyboardImageUrl} alt={`Storyboard for scene ${i+1}`} className="w-full h-full object-cover rounded-lg"/>
                                                }
                                            </div>
                                        ) : null}
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-gray-400">{t('script_generator.table_visual')}</label>
                                            <button onClick={() => handleGenerateStoryboard(i)} disabled={isGeneratingStoryboard === i} className="p-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 text-xs flex items-center gap-1 font-semibold">
                                                <PhotoIcon className="w-4 h-4"/> Generate Storyboard
                                            </button>
                                        </div>
                                        <textarea value={scene.visual} onChange={e => handleScriptChange('scene', i, 'visual', e.target.value)} rows={4} className="w-full text-sm bg-gray-700/50 rounded p-2 mt-1 text-gray-300 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"/>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-400">{t('script_generator.table_voiceover')}</label>
                                        <textarea value={scene.voiceover} onChange={e => handleScriptChange('scene', i, 'voiceover', e.target.value)} rows={4} className="w-full text-sm bg-gray-700/50 rounded p-2 mt-1 text-gray-300 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2">{t('script_generator.cta_title')}</h4>
                    <textarea
                        value={script?.cta || ''}
                        onChange={e => handleScriptChange('cta', 0, 'visual', e.target.value)}
                        rows={2}
                        className="w-full bg-gray-800/50 rounded-lg p-3 text-gray-300 border border-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>
            <div className="text-center">
                <button onClick={handleSave} className="w-full max-w-sm inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                    <CheckBadgeIcon className="w-6 h-6 mr-3" />
                    {t('script_editor.save_button')}
                </button>
            </div>
        </div>
    );
};

export default ScriptEditor;