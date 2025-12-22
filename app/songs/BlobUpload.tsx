import { useRef, useState } from 'react';

const MAX_FILE_SIZE_MB = 4.5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const getFilenameFromUrl = (url: string): string | null => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || null;
  } catch {
    return url.split('/').pop() || null;
  }
};

const BlobUpload = ({blobUrl, onFormChange, songId}:{blobUrl: string; onFormChange: (updates: Partial<{ blobUrl: string }>) => void; songId?: string}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit`);
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (songId) {
        formData.append('songId', songId);
      }
      const response = await fetch('/api/songs/blob', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }
      const data = await response.json();
      onFormChange({ blobUrl: data.url });
    } catch (uploadErr) {
      console.error('Error uploading file:', uploadErr);
      setUploadError(uploadErr instanceof Error ? uploadErr.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const filename = blobUrl ? getFilenameFromUrl(blobUrl) : null;

  return (
    <div>
      <label className="text-xs text-gray-400">File Attachment (PDF, MIDI, etc.)</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={blobUrl}
          onChange={(e) => onFormChange({ blobUrl: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="File URL"
        />
        <div className="flex items-center gap-1">
          <input ref={fileInputRef} type="file" accept=".pdf,.midi,.mid,.mp3,.wav,.txt,.xml,.musicxml" onChange={handleFileSelect} style={{display: 'none'}} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
      {filename && blobUrl && (
        <a href={blobUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{filename}</a>
      )}
      {uploadError && <p className="text-red-600 text-xs">{uploadError}</p>}
    </div>
  );
};

export default BlobUpload;
