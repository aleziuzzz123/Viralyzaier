import React from 'react';
import { XCircleIcon } from './Icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const tutorials = [
    { title: "Trimming Clips", description: "Hover over the edge of a clip and drag to change its length.", gif: "https://storage.googleapis.com/gemini-web-assets/notebook-assets/trim_demo.gif" },
    { title: "Moving Clips", description: "Click and drag the center of a clip to move it to a new position on the timeline.", gif: "https://storage.googleapis.com/gemini-web-assets/notebook-assets/move_demo.gif" },
    { title: "Adding Stickers", description: "Search for a sticker in the VFX panel, then click to add it. Select it on the preview to move or resize.", gif: "https://storage.googleapis.com/gemini-web-assets/notebook-assets/sticker_demo.gif" },
    { title: "Applying Effects", description: "Select a clip, then choose an animation, transition, or AI effect from the Inspector panel.", gif: "https://storage.googleapis.com/gemini-web-assets/notebook-assets/effect_demo.gif" },
];

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center animate-fade-in-up z-50" style={{ animationDuration: '0.3s' }} onClick={onClose}>
            <div className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] m-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Creative Studio Help</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><XCircleIcon className="w-8 h-8"/></button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {tutorials.map(tut => (
                            <div key={tut.title} className="bg-gray-900/50 p-4 rounded-lg">
                                <h3 className="font-bold text-white mb-2">{tut.title}</h3>
                                <div className="aspect-video bg-black rounded-md overflow-hidden mb-2">
                                    <img src={tut.gif} alt={`${tut.title} tutorial gif`} className="w-full h-full object-cover" />
                                </div>
                                <p className="text-sm text-gray-400">{tut.description}</p>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HelpModal;