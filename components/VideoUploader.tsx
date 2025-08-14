import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect }) => {
  const { t } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragIn = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      }
      e.dataTransfer.clearData();
    }
  }, [onFileSelect]);
  
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const dragOverClass = isDragging ? 'border-indigo-500 bg-gray-800/50' : 'border-gray-600 hover:border-indigo-500';

  return (
    <div 
      className={`w-full max-w-lg p-8 border-2 border-dashed ${dragOverClass} rounded-2xl text-center transition-all duration-300 ease-in-out cursor-pointer`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center text-gray-400">
        <UploadIcon className="w-16 h-16 mb-4 text-gray-500" />
        <p className="text-xl font-semibold text-gray-300">{t('video_uploader.drag_drop')}</p>
        <p className="mt-2">{t('video_uploader.or')}</p>
        <p className="mt-2 text-indigo-400 font-semibold">{t('video_uploader.browse')}</p>
        <p className="mt-4 text-xs text-gray-500">{t('video_uploader.supports')}</p>
      </div>
    </div>
  );
};

export default VideoUploader;