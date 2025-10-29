'use client';

import { useRef, useState } from 'react';

const VideoUploader = ({onVideoLoad}:{onVideoLoad: (file: File, videoElement: HTMLVideoElement) => void}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        handleFile(file);
      }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };
  
  const handleFile = (file: File) => {
    const videoURL = URL.createObjectURL(file);
    setVideoSrc(videoURL);
    setFileName(file.name);
    
    // Wait for video element to be ready
    setTimeout(() => {
      if (videoRef.current) {
        onVideoLoad(file, videoRef.current);
      }
    }, 100);
  };
  
  const handleContainerClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="mb-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">1</div>
        <h2 className="text-gray-900 font-semibold text-lg m-0">Upload MP4 Video</h2>
      </div>
      <div className="w-1/2">
        <div onClick={handleContainerClick} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer bg-white ${dragOver ? 'border-indigo-600 bg-indigo-50' : fileName ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-indigo-600 hover:bg-gray-50 hover:shadow-md hover:-translate-y-px'}`}>
          <input ref={fileInputRef} type="file" accept="video/mp4" onChange={handleFileChange} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="pointer-events-none">
            <div className="text-3xl mb-2 text-gray-400">🎬</div>
            <div className="text-gray-700 font-medium mb-1">{fileName || 'Choose MP4 Video File'}</div>
            <div className="text-gray-500 text-sm">Frames from this video will be used as slide backgrounds</div>
          </div>
        </div>
      </div>
      {videoSrc && (
        <div className="mt-4 animate-in fade-in duration-300">
          <video ref={videoRef} src={videoSrc} controls className="max-w-full rounded-lg border-2 border-gray-200 shadow-sm" />
        </div>
      )}
    </div>
  );
};

export default VideoUploader;

