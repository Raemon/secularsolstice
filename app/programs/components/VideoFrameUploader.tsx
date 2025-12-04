'use client';

import {useState, useRef} from 'react';

const VideoFrameUploader = ({programId, onUploadComplete}:{programId: string, onUploadComplete?: () => void}) => {
  const [status, setStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatus('Uploading video...');

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch(`/api/programs/${programId}/video-frames`, {method: 'POST', body: formData});

      if (!response.ok) {
        throw new Error('Failed to upload video');
      }

      const result = await response.json();
      setStatus('Successfully uploaded video');

      if (onUploadComplete) {
        onUploadComplete();
      }

      setTimeout(() => {
        setStatus('');
        setIsUploading(false);
      }, 2000);
    } catch (error) {
      console.error('Error uploading video:', error);
      setStatus('Error uploading video');
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} style={{display: 'none'}} />
      <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-2 py-1 text-xs bg-blue-600 text-white disabled:bg-gray-600">
        {isUploading ? 'Uploading...' : 'Upload Video'}
      </button>
      {status && <span className="text-xs text-gray-300">{status}</span>}
    </div>
  );
};

export default VideoFrameUploader;

