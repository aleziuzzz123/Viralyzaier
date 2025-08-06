import React, { useState, useEffect, useRef } from 'react';
import { Project, Script, Platform } from '../types';
import { PencilIcon, CheckBadgeIcon, MagicWandIcon, SparklesIcon, PlusIcon, TrashIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { rewriteScriptScene } from '../services/geminiService';
import { getErrorMessage } from '../utils';

interface ScriptEditorProps {
    project: Project;
    onScriptSaved: (script: Script) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ project, onScriptSaved }) => {
    const { t, consumeCredits } = useAppContext();
    const [script, setScript] = useState<Script | null>(project.script);
    const [activeCopilot, setActiveCopilot] = useState<number | null>(null);
    const [isRewriting, setIsRewriting] = useState(false);
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
        field: 'visual' | 'voiceover' | 'onScreenText',
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
    
    const addHook = () => {
        if (!script) return;
        const newHooks = [...script.hooks, ''];
        setScript({ ...script, hooks: newHooks });
    };

    const removeHook = (index: number) => {
        if (!script || script.hooks.length <= 1) return;
        const newHooks = script.hooks.filter((_, i) => i !== index);
        setScript({ ...script, hooks: newHooks });
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
        { key: 'action_visual', label: t('script_editor.copilot.action_visual') },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{t('script_editor.title')}</h1>
                <p className="mt-2 text-lg text-gray-400">{t('script_editor.subtitle')}</p>
            </header>

            <div className="bg-gray-900/40 p-8 rounded-2xl space-y-6">
                <div>
                    <h4 className="font-bold text-indigo-400 mb-2">{t('script_generator.hooks_title')}</h4>
                     <div className="space-y-3">
                        {script?.hooks.map((hook, index) => (
                            <div key={index} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <span className="text-sm font-bold text-gray-400">{index + 1}.</span>
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
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {script?.scenes.map((scene, i) => (
                            <div key={i} className="p-4 bg-gray-800/50 rounded-lg space-y-2 relative">
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
                                <div>
                                    <label className="text-xs font-bold text-gray-400">{t('script_generator.table_visual')}</label>
                                    <textarea value={scene.visual} onChange={e => handleScriptChange('scene', i, 'visual', e.target.value)} rows={2} className="w-full text-sm bg-gray-700/50 rounded p-2 mt-1 text-gray-300 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400">{t('script_generator.table_voiceover')}</label>
                                    <textarea value={scene.voiceover} onChange={e => handleScriptChange('scene', i, 'voiceover', e.target.value)} rows={3} className="w-full text-sm bg-gray-700/50 rounded p-2 mt-1 text-gray-300 border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"/>
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