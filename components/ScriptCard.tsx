import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Script, Folder } from '../types.ts';

interface ScriptCardProps {
  script: Script;
  onOpenSaveModal: (script: Script) => void;
  onUnsave: (scriptId: string) => void;
  onDelete?: (scriptId: string) => void;
  isSaved: boolean;
  isScoring?: boolean;
  isMoving?: boolean;
  isSavedView?: boolean;
  folders?: Folder[];
  onMoveScriptToFolder?: (scriptId: string, folderId: string | null) => void;
  addNotification?: (message: string) => void;
  onVisualize?: (scriptId: string, artStyle: string) => void;
  isVisualizing?: boolean;
  onRemix?: (script: Script) => void;
  onToggleSpeech?: (script: Script) => void;
  isSpeaking?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (scriptId:string) => void;
}

const toneEmojis: { [key: string]: string } = {
  'Funny': '😂', 'Inspirational': '✨', 'Educational': '🎓', 'Shocking': '🤯', 'Heartwarming': '💖', 'Action-Packed': '💥',
  'Controversial': '🗣️', 'Luxury & Aspirational': '💎', 'Data-Driven': '📊', 'Viral Formula': '🧪', 'Remixed': '🎛️'
};

const artStyles = ['Cinematic', 'Anime', 'Photorealistic', 'Cartoon'];

const AnalysisDetail: React.FC<{ label: string, content?: string }> = ({ label, content }) => (
    <div>
        <h5 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">{label}</h5>
        <p className="text-sm text-white/90">{content || 'N/A'}</p>
    </div>
);


export const ScriptCard: React.FC<ScriptCardProps> = ({ 
  script, onOpenSaveModal, onUnsave, onDelete, isSaved, isScoring = false, isMoving = false, isSavedView = false, 
  folders = [], onMoveScriptToFolder, addNotification, onVisualize, isVisualizing = false,
  onRemix, onToggleSpeech, isSpeaking = false, isSelectable = false, isSelected = false, onToggleSelect
}) => {
  const [copied, setCopied] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visualsExpanded, setVisualsExpanded] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [showArtStylePicker, setShowArtStylePicker] = useState(false);

  const fullScriptText = `Title: ${script.title}\n\nHook: ${script.hook}\n\nScript:\n${script.script}`;

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullScriptText).then(() => {
      setCopied(true);
      if (addNotification) addNotification("Script copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [fullScriptText, addNotification]);

  const handleSaveClick = (e: React.MouseEvent) => { 
    e.stopPropagation();
    isSaved ? onUnsave(script.id) : onOpenSaveModal(script); 
  };
  
  const handleVisualizeClick = () => {
    if (onVisualize) {
        setShowArtStylePicker(true);
        setActionsMenuOpen(false);
    }
  };

  const handleArtStyleSelect = (style: string) => {
    if (onVisualize) {
        onVisualize(script.id, style);
        setVisualsExpanded(true);
    }
    setShowArtStylePicker(false);
  };

  const handleMove = (folderId: string | null) => { 
      if (onMoveScriptToFolder) onMoveScriptToFolder(script.id, folderId); 
      setActionsMenuOpen(false); 
  };
  
  const handleDeleteClick = () => { if (onDelete) { onDelete(script.id); setActionsMenuOpen(false); } };
  const handleRemixClick = () => { if (onRemix) { onRemix(script); setActionsMenuOpen(false); } };
  const handleToggleSpeechClick = () => { if (onToggleSpeech) { onToggleSpeech(script); setActionsMenuOpen(false); } };
  
  const handleCardClick = () => {
    if (isSelectable && onToggleSelect) {
      onToggleSelect(script.id);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
          setActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionsMenuRef]);

  const emoji = toneEmojis[script.tone] || '📄';
  
  const ActionMenuItem: React.FC<{onClick: (e: React.MouseEvent) => void, icon: string, label: string, disabled?: boolean, destructive?: boolean, children?: React.ReactNode}> = ({onClick, icon, label, disabled, destructive, children}) => (
      <button onClick={onClick} disabled={disabled} className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors duration-150 ${destructive ? 'text-red-400 hover:bg-red-900/50' : 'text-purple-200 hover:bg-[#4A3F7A]/50 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
          <i className={`${icon} w-4 text-center`}></i>
          <span>{label}</span>
          {children}
      </button>
  );

  return (
    <div 
        className={`bg-[#2A1A5E] rounded-xl border p-6 shadow-lg transition-all duration-300 flex flex-col relative ${isSelectable ? 'cursor-pointer' : ''} ${script.isNew ? 'border-[#DAFF00]/80' : 'border-[#4A3F7A]'} ${isSelected ? 'border-[#DAFF00] ring-2 ring-[#DAFF00]' : 'hover:border-[#DAFF00]/50 hover:shadow-2xl hover:shadow-[#DAFF00]/5'}`}
        onClick={handleCardClick}
    >
      {isSelectable && (
        <div className="absolute top-4 left-4 z-20" onClick={(e) => e.stopPropagation()}>
           <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect && onToggleSelect(script.id)}
              className="h-5 w-5 rounded-md bg-[#1A0F3C] border-[#4A3F7A] text-[#DAFF00] focus:ring-[#DAFF00] focus:ring-offset-[#2A1A5E]"
           />
        </div>
      )}

      <div className={`flex items-start justify-between mb-4 ${isSelectable ? 'ml-8' : ''}`}>
        <h3 className="text-xl font-bold text-[#DAFF00] pr-4">{script.title}</h3>
        <div className="flex items-center space-x-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={handleCopy} className="text-purple-300 hover:text-[#DAFF00] transition-colors duration-200 p-2 rounded-full bg-[#1A0F3C]/50 hover:bg-[#1A0F3C]" title={copied ? "Copied!" : "Copy Script"}>
            {copied ? <i className="fa-solid fa-check text-green-400"></i> : <i className="fa-solid fa-copy"></i>}
          </button>
           <button onClick={handleSaveClick} disabled={isScoring} className={`transition-colors duration-200 p-2 rounded-full bg-[#1A0F3C]/50 hover:bg-[#1A0F3C] disabled:cursor-not-allowed ${isSaved ? 'text-[#DAFF00]' : 'text-purple-300 hover:text-[#DAFF00]'}`} title={isSaved ? "Unsave Script" : "Save to Favorites"}>
            {isScoring ? (<svg className="animate-spin h-4 w-4 text-[#DAFF00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : (<i className={`fa-bookmark ${isSaved ? 'fa-solid' : 'fa-regular'}`}></i>)}
          </button>
          
          {/* Kebab Menu */}
           <div className="relative" ref={actionsMenuRef}>
              <button onClick={(e) => {e.stopPropagation(); setActionsMenuOpen(o => !o);}} className="text-purple-300 hover:text-[#DAFF00] transition-colors duration-200 p-2 rounded-full bg-[#1A0F3C]/50 hover:bg-[#1A0F3C]" title="More actions">
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </button>
              {actionsMenuOpen && (
                 <div className="absolute right-0 mt-2 w-56 bg-[#1A0F3C] border border-[#4A3F7A] rounded-md shadow-lg z-10 p-2 space-y-1">
                    {onVisualize && <ActionMenuItem onClick={(e) => {e.stopPropagation(); handleVisualizeClick();}} icon="fa-solid fa-palette" label="Visualize Script" disabled={isVisualizing} />}
                    {onRemix && <ActionMenuItem onClick={(e) => {e.stopPropagation(); handleRemixClick();}} icon="fa-solid fa-arrows-spin" label="Remix This Script" />}
                    {onToggleSpeech && <ActionMenuItem onClick={(e) => {e.stopPropagation(); handleToggleSpeechClick();}} icon={isSpeaking ? "fa-solid fa-stop" : "fa-solid fa-volume-high"} label={isSpeaking ? "Stop Voiceover" : "Listen to Script"} />}
                    {isSavedView && <div className="border-t border-[#4A3F7A]/50 my-1 !mx-2"></div>}
                    {isSavedView && onMoveScriptToFolder && (
                        <div className="relative group/move">
                            <button disabled={isMoving} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors duration-150 text-purple-200 hover:bg-[#4A3F7A]/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                <i className="fa-solid fa-folder-plus w-4 text-center"></i>
                                <span>Move to folder</span>
                                <i className="fa-solid fa-chevron-right text-xs ml-auto"></i>
                            </button>
                            <div className="absolute left-full -top-2 ml-1 w-48 bg-[#1A0F3C] border border-[#4A3F7A] rounded-md shadow-lg z-20 p-1 hidden group-hover/move:block">
                                <button onClick={(e) => {e.stopPropagation(); handleMove(null);}} className="w-full text-left block px-3 py-2 text-sm text-purple-200 hover:bg-[#2A1A5E] hover:text-white rounded-md">
                                    <i className="fa-regular fa-clone w-4 mr-2"></i>All Scripts (no folder)
                                </button>
                                <div className="border-t border-[#4A3F7A] my-1"></div>
                                {folders.filter(f => f.id !== 'all').map(folder => (
                                    <button key={folder.id} onClick={(e) => {e.stopPropagation(); handleMove(folder.id);}} className="w-full text-left block px-3 py-2 text-sm text-purple-200 hover:bg-[#2A1A5E] hover:text-white rounded-md">
                                        <i className="fa-regular fa-folder w-4 mr-2"></i>{folder.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {isSavedView && onDelete && <ActionMenuItem onClick={(e) => {e.stopPropagation(); handleDeleteClick();}} icon="fa-solid fa-trash-can" label="Delete Script" destructive />}
                 </div>
              )}
           </div>
        </div>
      </div>

      {showArtStylePicker && (
          <div className="bg-[#1A0F3C]/80 rounded-lg p-3 my-2">
              <p className="text-center text-xs text-purple-200 mb-2 font-semibold">Choose an art style:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {artStyles.map(style => (
                      <button key={style} onClick={() => handleArtStyleSelect(style)} className="text-xs text-center font-semibold text-white bg-[#2A1A5E] rounded-md px-2 py-1.5 hover:bg-[#DAFF00] hover:text-[#1A0F3C] transition-colors duration-200">
                          {style}
                      </button>
                  ))}
              </div>
          </div>
      )}

      <div className={`flex-grow ${isSelectable ? 'ml-8' : ''}`}>
        <div className="space-y-4">
          <div><h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase">Hook (First 3s)</h4><p className="text-[#F0F0F0] mt-1 italic">"{script.hook}"</p></div>
          <div className="border-t border-[#4A3F7A]/50 my-4"></div>
          <div>
            <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase">Full Script</h4>
            <pre className={`text-purple-100/90 mt-2 whitespace-pre-wrap text-sm leading-relaxed font-sans transition-all duration-300 ${!isExpanded ? 'line-clamp-3' : 'line-clamp-none'}`}>{script.script}</pre>
            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-[#DAFF00] text-sm font-semibold mt-2 hover:underline">
              {isExpanded ? 'Show Less' : 'Show More...'}
            </button>
          </div>
        </div>
      </div>

      {(script.viral_score_breakdown) && (
        <div className="border-t border-[#4A3F7A]/50 mt-4 pt-4">
          <button onClick={(e) => { e.stopPropagation(); setAnalysisExpanded(!analysisExpanded);}} className="w-full flex justify-between items-center text-left">
              <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase">Detailed Virality Analysis</h4>
              <i className={`fa-solid fa-chevron-down transition-transform ${analysisExpanded ? 'rotate-180' : ''}`}></i>
          </button>
          {analysisExpanded && (
            <div className="mt-4 bg-[#1A0F3C]/60 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnalysisDetail label="Hook Analysis" content={script.viral_score_breakdown.hookAnalysis} />
                    <AnalysisDetail label="Pacing & Flow" content={script.viral_score_breakdown.pacingAnalysis} />
                    <AnalysisDetail label="Value Proposition" content={script.viral_score_breakdown.valueAnalysis} />
                    <AnalysisDetail label="Call To Action" content={script.viral_score_breakdown.ctaAnalysis} />
                </div>
                <div className="border-t border-[#4A3F7A]/50 pt-4">
                     <AnalysisDetail label="Final Verdict" content={script.viral_score_breakdown.finalVerdict} />
                </div>
            </div>
          )}
        </div>
      )}


       {(script.visuals || isVisualizing) && (
        <div className="border-t border-[#4A3F7A]/50 mt-4 pt-4">
            <button onClick={(e) => { e.stopPropagation(); setVisualsExpanded(!visualsExpanded);}} className="w-full flex justify-between items-center text-left">
              <h4 className="font-semibold text-purple-200 text-sm tracking-wider uppercase">AI Storyboard Concepts</h4>
              <i className={`fa-solid fa-chevron-down transition-transform ${visualsExpanded ? 'rotate-180' : ''}`}></i>
            </button>
             {visualsExpanded && (
                <div className="mt-4">
                    {isVisualizing && (!script.visuals || script.visuals.length === 0) ? (
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                             <div className="aspect-video bg-slate-700 rounded-lg"></div>
                             <div className="aspect-video bg-slate-700 rounded-lg"></div>
                             <div className="aspect-video bg-slate-700 rounded-lg"></div>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {script.visuals?.map((base64Image, index) => (
                                <a href={`data:image/jpeg;base64,${base64Image}`} download={`script_visual_${script.id}_${index+1}.jpg`} key={index} className="group aspect-video block">
                                  <img src={`data:image/jpeg;base64,${base64Image}`} alt={`Visual concept ${index + 1}`} className="w-full h-full object-cover rounded-lg border-2 border-transparent group-hover:border-[#DAFF00] transition-all"/>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
             )}
        </div>
      )}

      <div className="border-t border-[#4A3F7A]/50 mt-6 pt-4 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-[#1A0F3C] text-[#DAFF00] text-xs font-bold px-3 py-1 rounded-full"><span>{emoji}</span><span className="ml-1.5 uppercase tracking-wider">{script.tone}</span></div>
            {script.isNew && (<div className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full"><i className="fa-solid fa-star-of-life fa-spin mr-1.5" style={{animationDuration: '3s'}}></i><span className="uppercase tracking-wider">New!</span></div>)}
         </div>
          {script.viral_score_breakdown?.overallScore && (
              <div className="group relative">
                <span className="text-sm font-semibold text-purple-300">Viral Score: <span className="text-white font-bold">{script.viral_score_breakdown.overallScore}</span></span>
                {script.viral_score_breakdown.finalVerdict && <div className="absolute bottom-full mb-2 w-72 bg-black/80 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">{script.viral_score_breakdown.finalVerdict}</div>}
              </div>
          )}
      </div>
    </div>
  );
};