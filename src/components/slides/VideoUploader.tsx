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
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <h2 className="text-sm m-0">Upload MP4 Video</h2>
      </div>
      <div className="w-1/2">
        <div onClick={handleContainerClick} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative border border-dashed p-4 text-center cursor-pointer ${dragOver ? 'bg-black/80' : fileName ? 'bg-black' : ''}`}>
          <input ref={fileInputRef} type="file" accept="video/mp4" onChange={handleFileChange} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="pointer-events-none">
            <div className="text-sm mb-1">{fileName || 'Choose MP4 Video File'}</div>
            <div className="text-xs text-gray-500">Frames from this video will be used as slide backgrounds</div>
          </div>
        </div>
      </div>
      {videoSrc && (
        <div className="mt-2">
          <video ref={videoRef} src={videoSrc} controls className="max-w-full" />
        </div>
      )}
    </div>
  );
};

export default VideoUploader;

