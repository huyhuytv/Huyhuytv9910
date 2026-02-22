
import React, { useState, useCallback, useRef } from 'react';
import { Loader } from './Loader';

interface FileImporterProps {
  onFileLoad: (file: File) => void;
  isLoading: boolean;
  error: string;
}

export const FileImporter: React.FC<FileImporterProps> = ({ onFileLoad, isLoading, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileLoad(e.dataTransfer.files[0]);
    }
  }, [onFileLoad]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoad(e.target.files[0]);
    }
  };
  
  const handleClick = () => {
      if (!isLoading) {
          fileInputRef.current?.click();
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        fileInputRef.current?.click();
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 text-center">
      <div 
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        className={`p-10 border-2 border-dashed rounded-xl transition-colors duration-300 cursor-pointer ${isDragging ? 'border-sky-400 bg-slate-700/50' : 'border-slate-600 hover:border-sky-500 hover:bg-slate-800/30'}`}
        role="button"
        tabIndex={0}
        aria-label="Tải lên tệp Character Card"
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          className="sr-only"
          accept=".png,.json"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <div className="flex flex-col items-center pointer-events-none">
            <svg className="w-16 h-16 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p className="text-lg font-semibold text-slate-300">
              <span className="text-sky-400">Nhấn để tải lên</span> hoặc kéo và thả
            </p>
            <p className="text-sm text-slate-500">Tệp Character Card (.png) hoặc JSON</p>
        </div>
      </div>
      {isLoading && <div className="mt-6"><Loader message="Đang phân tích thẻ..." /></div>}
      {error && <p className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
    </div>
  );
};
