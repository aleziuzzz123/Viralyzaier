import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-[#4A3F7A]/50">
      <div className="container mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-7 h-7 text-[#DAFF00]" />
          <h1 className="text-xl font-bold tracking-wider text-[#F0F0F0]">Vid Script Hub</h1>
        </div>
      </div>
    </header>
  );
};