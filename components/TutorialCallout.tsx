
import React from 'react';
import { BookOpenIcon, XIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface TutorialCalloutProps {
    id: string;
    children: React.ReactNode;
}

// Helper component to parse and style the custom tags in the tutorial text.
const ParsedTutorialText: React.FC<{ text: string }> = ({ text }) => {
    // Splits the string by the tags, e.g., "<1>Strategy</1>", keeping the delimiters.
    const parts = text.split(/(<\d+>.*?<\/\d+>)/g).filter(Boolean);
    return (
        <>
            {parts.map((part, index) => {
                const match = part.match(/<(\d+)>(.*?)<\/(\d+)>/);
                if (match) {
                    const [, openTag, content, closeTag] = match;
                    // Ensure the open and close tags match, then style the content.
                    if (openTag === closeTag) {
                        return (
                            <strong key={index} className="font-bold text-indigo-400">
                                {content}
                            </strong>
                        );
                    }
                }
                // If it's not a tag, return the text part as is.
                return part;
            })}
        </>
    );
};

const TutorialCallout: React.FC<TutorialCalloutProps> = ({ id, children }) => {
    const { dismissTutorial } = useAppContext();
    
    return (
        <div className="bg-gradient-to-r from-gray-800 via-gray-800/80 to-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 relative animate-fade-in-up">
            <button onClick={() => dismissTutorial(id)} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors">
                <XIcon className="w-5 h-5" />
            </button>
            <div className="flex items-start">
                <div className="flex-shrink-0 mr-5">
                    <div className="bg-indigo-500 p-3 rounded-full">
                        <BookOpenIcon className="w-6 h-6 text-white" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Your Project Workflow</h3>
                    <p className="mt-2 text-gray-300 leading-relaxed">
                        {/* Use the parser for string children to apply styling */}
                        {typeof children === 'string' ? <ParsedTutorialText text={children} /> : children}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TutorialCallout;
