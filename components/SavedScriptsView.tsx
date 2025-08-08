

import React, { useState, useMemo, useRef, useContext, useCallback, useEffect } from 'react';
import { ScriptCard } from './ScriptCard.tsx';
import type { Script, Folder } from '../types.ts';
import { DataContext } from '../context/DataContext.tsx';
import { UIContext } from '../context/UIContext.tsx';

interface SavedScriptsViewProps {
    onAddNewFolder: (folderName: string) => void;
    onOpenSaveModal: (script: Script) => void;
    onUnsaveScript: (scriptId: string) => void;
    onDeleteScript: (scriptId: string) => void;
    isScriptSaved: (script: Script) => boolean;
    scoringScriptId: string | null;
    onMoveScriptToFolder: (scriptId:string, folderId: string | null) => void;
    onRenameFolder: (folderId: string, newName: string) => void;
    onDeleteFolder: (folderId: string) => void;
    onVisualize: (scriptId: string, artStyle: string) => void;
    visualizingScriptId: string | null;
    onToggleSpeech: (script: Script) => void;
    speakingScriptId: string | null;
}

export const SavedScriptsView: React.FC<SavedScriptsViewProps> = ({ 
    onAddNewFolder, onOpenSaveModal, onUnsaveScript, onDeleteScript,
    isScriptSaved, scoringScriptId, onMoveScriptToFolder, onRenameFolder, onDeleteFolder,
    onVisualize, visualizingScriptId, onToggleSpeech, speakingScriptId
}) => {
    const { state: dataState, dispatch: dataDispatch } = useContext(DataContext);
    const { savedScripts, folders } = dataState;
    const { state: uiState, dispatch: uiDispatch } = useContext(UIContext);
    const { movingScriptId } = uiState;
    
    const [activeFolderId, setActiveFolderId] = useState('all');
    const [sortBy, setSortBy] = useState<'dateSaved' | 'viralScore'>('dateSaved');
    const [searchTerm, setSearchTerm] = useState('');
    const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
    const [tempFolderName, setTempFolderName] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [selectedScriptIds, setSelectedScriptIds] = useState<string[]>([]);
    const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
    const batchMoveButtonRef = useRef<HTMLButtonElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const isSelectionMode = selectedScriptIds.length > 0;

    const addNotification = useCallback((message: string) => {
        // This component doesn't have access to the user id for async notifications
        // A more robust solution might involve passing userId or having a global notification service
        console.log("Notification:", message);
    }, []);

    const filteredAndSortedScripts = useMemo(() => {
        let scriptsToDisplay = savedScripts.filter(script => 
            searchTerm === '' || 
            script.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            script.script.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (script.hook && script.hook.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (activeFolderId !== 'all') {
            scriptsToDisplay = scriptsToDisplay.filter(script => script.folder_id === activeFolderId);
        }
        
        return scriptsToDisplay.sort((a, b) => {
            if (sortBy === 'viralScore') return (b.viral_score_breakdown?.overallScore || 0) - (a.viral_score_breakdown?.overallScore || 0);
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });
    }, [savedScripts, searchTerm, sortBy, activeFolderId]);

    const totalPages = Math.ceil(filteredAndSortedScripts.length / itemsPerPage);
    const paginatedScripts = useMemo(() => {
        return filteredAndSortedScripts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredAndSortedScripts, currentPage, itemsPerPage]);
    
    const allVisibleScriptsSelected = useMemo(() => {
        const visibleIds = paginatedScripts.map(s => s.id);
        return visibleIds.length > 0 && visibleIds.every(id => selectedScriptIds.includes(id));
    }, [selectedScriptIds, paginatedScripts]);
    
    const handleAddNewFolderClick = () => {
        const newFolderName = prompt("Enter new folder name:");
        if (newFolderName) onAddNewFolder(newFolderName);
    };

    const handleRenameStart = (folder: Folder) => {
        setRenamingFolderId(folder.id);
        setTempFolderName(folder.name);
        setTimeout(() => renameInputRef.current?.focus(), 0);
    };
    
    const handleRenameCancel = () => {
        setRenamingFolderId(null);
        setTempFolderName('');
    };

    const handleRenameSubmit = (folderId: string) => {
        if (tempFolderName.trim() && tempFolderName.trim() !== folders.find(f => f.id === folderId)?.name) {
            onRenameFolder(folderId, tempFolderName.trim());
        }
        setRenamingFolderId(null);
    };
    
    const renderEmptyState = () => {
        if (searchTerm && filteredAndSortedScripts.length === 0) {
            return { title: 'No Results Found', message: `Your search for "${searchTerm}" did not match any scripts.` };
        }
        if (activeFolderId !== 'all' && filteredAndSortedScripts.length === 0) {
            return { title: 'This Folder is Empty', message: 'You can drag and drop scripts here.' };
        }
        if (savedScripts.length === 0) {
            return { title: 'Your Library is Empty', message: 'Generate some scripts and click the bookmark icon to save them here.' };
        }
        return { title: 'No Scripts Found', message: 'Try adjusting your search or filter criteria.' };
    };

    const getFolderScriptCount = (folderId: string) => {
        if (folderId === 'all') return savedScripts.length;
        return savedScripts.filter(s => s.folder_id === folderId).length;
    };
    
    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, scriptId: string) => {
        e.dataTransfer.setData('scriptId', scriptId);
        e.currentTarget.style.opacity = '0.5';
    };
    
    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.style.opacity = '1';
        setDragOverFolderId(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLAnchorElement>, folderId: string) => {
        e.preventDefault();
        if(dragOverFolderId !== folderId) {
            setDragOverFolderId(folderId);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLAnchorElement>, folderId: string | null) => {
        e.preventDefault();
        const scriptId = e.dataTransfer.getData('scriptId');
        if (scriptId) {
            onMoveScriptToFolder(scriptId, folderId);
        }
        setDragOverFolderId(null);
    };
    
     // Batch Action Handlers
    const handleToggleSelect = (scriptId: string) => {
        setSelectedScriptIds(prev =>
            prev.includes(scriptId) ? prev.filter(id => id !== scriptId) : [...prev, scriptId]
        );
    };
    
    const handleToggleSelectAll = () => {
        if (allVisibleScriptsSelected) {
            const visibleIds = paginatedScripts.map(s => s.id);
            setSelectedScriptIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedScriptIds(prev => [...new Set([...prev, ...paginatedScripts.map(s => s.id)])]);
        }
    };
    
    const handleBatchDelete = () => {
        if (selectedScriptIds.length === 0) return;
        dataDispatch({ type: 'BATCH_DELETE_SCRIPTS_REQUEST', payload: { scriptIds: selectedScriptIds } });
        addNotification(`${selectedScriptIds.length} scripts deleted.`);
        setSelectedScriptIds([]);
    };
    
    const handleBatchMove = (folderId: string | null) => {
        if (selectedScriptIds.length === 0) return;
        const folderName = folderId ? folders.find(f => f.id === folderId)?.name : 'main library';
        dataDispatch({ type: 'BATCH_MOVE_SCRIPTS_REQUEST', payload: { scriptIds: selectedScriptIds, folderId } });
        addNotification(`${selectedScriptIds.length} scripts moved to "${folderName}".`);
        setSelectedScriptIds([]);
        setIsBatchMoveOpen(false);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    useEffect(() => {
        setCurrentPage(1); // Reset to first page when filters change
    }, [activeFolderId, sortBy, searchTerm]);


    return (
        <div className="flex flex-col md:flex-row gap-8 h-full">
            <aside className="w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
                <div className="bg-[#2A1A5E]/50 rounded-xl p-4 h-full">
                     <button onClick={handleAddNewFolderClick} className="w-full flex items-center justify-center bg-[#DAFF00] text-[#1A0F3C] font-bold py-2.5 px-4 rounded-md hover:bg-opacity-90 transition-all duration-200 text-sm mb-4"><i className="fa-solid fa-plus mr-2"></i>New Folder</button>
                    <nav className="space-y-1">
                        <h3 className="px-3 text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Folders</h3>
                        {folders.map(folder => {
                            const isDropTarget = dragOverFolderId === folder.id;
                            return (
                                <div key={folder.id} className={`group flex items-center text-sm font-medium rounded-md transition-all duration-200 ${activeFolderId === folder.id ? 'bg-[#1A0F3C]' : ''} ${isDropTarget ? 'bg-[#DAFF00]/20 ring-2 ring-[#DAFF00]' : ''}`}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setActiveFolderId(folder.id); }}
                                        onDragOver={(e) => handleDragOver(e, folder.id)}
                                        onDragLeave={() => setDragOverFolderId(null)}
                                        onDrop={(e) => handleDrop(e, folder.id === 'all' ? null : folder.id)}
                                        className="flex-grow flex items-center px-3 py-2 truncate text-purple-200 hover:text-white"
                                    >
                                        <i className={`fa-regular ${folder.id === 'all' ? 'fa-clone' : 'fa-folder'} w-5 mr-3 text-purple-300/70 group-hover:text-white/80`}></i>
                                        {renamingFolderId === folder.id ? (
                                            <input type="text" ref={renameInputRef} value={tempFolderName} onChange={(e) => setTempFolderName(e.target.value)} onBlur={() => handleRenameSubmit(folder.id)} onKeyDown={(e) => {if(e.key === 'Enter') handleRenameSubmit(folder.id); if(e.key === 'Escape') handleRenameCancel();}} className="bg-transparent text-white outline-none w-full" />
                                        ) : (<span className="truncate">{folder.name}</span>)}
                                         <span className="ml-auto text-xs font-mono bg-[#1A0F3C]/50 text-purple-300/80 rounded-full px-2 py-0.5">{getFolderScriptCount(folder.id)}</span>
                                    </a>
                                    {folder.id !== 'all' && renamingFolderId !== folder.id && (
                                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pr-2 space-x-1">
                                            <button onClick={() => handleRenameStart(folder)} className="p-1 text-purple-200 hover:text-white"><i className="fa-solid fa-pencil text-xs"></i></button>
                                            <button onClick={() => onDeleteFolder(folder.id)} className="p-1 text-purple-200 hover:text-red-400"><i className="fa-solid fa-trash-can text-xs"></i></button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </nav>
                </div>
            </aside>

            <main className="flex-1">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">My Script Library</h1>
                    <p className="text-purple-300">Browse, search, and manage all your saved scripts. Drag scripts onto folders to organize them.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-grow">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-purple-300/50"></i>
                        <input type="text" placeholder="Search all scripts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#1A0F3C] border border-[#4A3F7A] rounded-md py-2.5 pl-10 pr-4 text-[#F0F0F0] placeholder-purple-300/50 focus:ring-2 focus:ring-[#DAFF00] focus:border-[#DAFF00] focus:outline-none transition duration-200" />
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                         <input
                            type="checkbox"
                            className="h-5 w-5 rounded-md bg-[#1A0F3C] border-[#4A3F7A] text-[#DAFF00] focus:ring-offset-[#1A0F3C] focus:ring-[#DAFF00]"
                            checked={allVisibleScriptsSelected}
                            onChange={handleToggleSelectAll}
                            title="Select all on this page"
                         />
                        <span className="text-sm text-purple-300">Sort by:</span>
                        <button onClick={() => setSortBy('dateSaved')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${sortBy === 'dateSaved' ? 'bg-[#DAFF00] text-[#1A0F3C]' : 'bg-[#2A1A5E] hover:bg-[#4A3F7A]/80'}`}>Date Saved</button>
                        <button onClick={() => setSortBy('viralScore')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${sortBy === 'viralScore' ? 'bg-[#DAFF00] text-[#1A0F3C]' : 'bg-[#2A1A5E] hover:bg-[#4A3F7A]/80'}`}>Viral Score</button>
                    </div>
                </div>

                <div className="space-y-6">
                    {paginatedScripts.length > 0 ? (
                        paginatedScripts.map((script) => (
                            <div key={script.id} draggable={!isSelectionMode} onDragStart={(e) => handleDragStart(e, script.id)} onDragEnd={handleDragEnd}>
                                <ScriptCard
                                    script={script} 
                                    onOpenSaveModal={onOpenSaveModal} 
                                    onUnsave={onUnsaveScript} 
                                    onDelete={onDeleteScript} 
                                    isSaved={isScriptSaved(script)} 
                                    isScoring={scoringScriptId === script.id} 
                                    isMoving={movingScriptId === script.id}
                                    isSavedView={true} 
                                    folders={folders} 
                                    onMoveScriptToFolder={onMoveScriptToFolder} 
                                    onVisualize={onVisualize}
                                    isVisualizing={visualizingScriptId === script.id}
                                    onToggleSpeech={onToggleSpeech}
                                    isSpeaking={speakingScriptId === script.id}
                                    addNotification={addNotification}
                                    isSelectable={true}
                                    isSelected={selectedScriptIds.includes(script.id)}
                                    onToggleSelect={handleToggleSelect}
                                />
                            </div>
                        ))
                    ) : (
                         <div className="text-center py-16 px-6 bg-[#1A0F3C]/50 rounded-lg border-2 border-dashed border-[#4A3F7A]">
                            <i className="fa-regular fa-face-sad-tear text-4xl text-purple-300 mb-4"></i>
                            <h3 className="mt-2 text-lg font-medium text-[#F0F0F0]">{renderEmptyState().title}</h3>
                            <p className="mt-1 text-sm text-purple-200/80">{renderEmptyState().message}</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-8">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 text-sm font-semibold bg-[#2A1A5E] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4A3F7A]">
                            <i className="fa-solid fa-arrow-left mr-2"></i> Previous
                        </button>
                        <span className="text-sm text-purple-300">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-semibold bg-[#2A1A5E] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4A3F7A]">
                            Next <i className="fa-solid fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                )}
            </main>
            
             {isSelectionMode && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1A0F3C] border-2 border-[#DAFF00] rounded-xl shadow-2xl shadow-[#DAFF00]/10 flex items-center gap-6 p-3">
                    <span className="text-sm font-semibold text-white px-2">{selectedScriptIds.length} script{selectedScriptIds.length > 1 ? 's' : ''} selected</span>
                    <div className="relative">
                        <button ref={batchMoveButtonRef} onClick={() => setIsBatchMoveOpen(prev => !prev)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#2A1A5E] text-purple-200 rounded-md hover:bg-[#4A3F7A]"><i className="fa-solid fa-folder-plus"></i> Move</button>
                        {isBatchMoveOpen && (
                             <div className="absolute bottom-full mb-2 w-48 bg-[#1A0F3C] border border-[#4A3F7A] rounded-md shadow-lg z-20 p-1">
                                <button onClick={() => handleBatchMove(null)} className="w-full text-left block px-3 py-2 text-sm text-purple-200 hover:bg-[#2A1A5E] hover:text-white rounded-md">
                                    <i className="fa-regular fa-clone w-4 mr-2"></i>All Scripts (no folder)
                                </button>
                                <div className="border-t border-[#4A3F7A] my-1"></div>
                                {folders.filter(f => f.id !== 'all').map(folder => (
                                    <button key={folder.id} onClick={() => handleBatchMove(folder.id)} className="w-full text-left block px-3 py-2 text-sm text-purple-200 hover:bg-[#2A1A5E] hover:text-white rounded-md">
                                        <i className="fa-regular fa-folder w-4 mr-2"></i>{folder.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleBatchDelete} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#2A1A5E] text-red-400 rounded-md hover:bg-[#4A3F7A]"><i className="fa-solid fa-trash-can"></i> Delete</button>
                    <button onClick={() => setSelectedScriptIds([])} className="text-purple-300 hover:text-white" title="Cancel selection"><i className="fa-solid fa-times"></i></button>
                </div>
             )}
        </div>
    );
};