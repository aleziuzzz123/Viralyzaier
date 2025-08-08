
import React from 'react';

interface PlaceholderViewProps {
    title: string;
    message: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, message }) => {
    return (
        <div className="text-center py-24 px-6 bg-[#2A1A5E]/50 rounded-lg border-2 border-dashed border-[#4A3F7A]">
            <i className="fa-solid fa-person-digging text-4xl text-purple-300 mb-4"></i>
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            <p className="text-purple-300/80">{message}</p>
        </div>
    );
};
