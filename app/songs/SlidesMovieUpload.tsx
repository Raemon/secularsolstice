import { useRef, useState } from 'react';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const SlidesMovieUpload = ({slidesMovieUrl, onFormChange, songId}:{slidesMovieUrl: string; onFormChange: (updates: Partial<{ label: string; content: string; audioUrl: string; slidesMovieUrl: string; bpm: number; transpose: number; previousVersionId: string; nextVersionId: string; slideCredits: string; programCredits: string }>) => void; songId?: string}) => {
  const [isUploadingMovie, setIsUploadingMovie] = useState(false);
  const [movieUploadError, setMovieUploadError] = useState<string | null>(null);
  const movieInputRef = useRef<HTMLInputElement>(null);

  const handleMovieSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('video/')) {
      setMovieUploadError(`Invalid file type: ${file.type || 'unknown'}. Please select a video file.`);
      if (movieInputRef.current) movieInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setMovieUploadError(`Movie file size (${sizeMB}MB) exceeds ${MAX_FILE_SIZE_MB}MB limit`);
      if (movieInputRef.current) movieInputRef.current.value = '';
      return;
    }
    setMovieUploadError(null);
    setIsUploadingMovie(true);
    try {
      const formData = new FormData();
      formData.append('movie', file);
      if (songId) {
        formData.append('songId', songId);
      }
      const response = await fetch('/api/songs/slides-movie', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Upload failed (${response.status}): ${errorData.error || response.statusText}`);
      }
      const data = await response.json();
      onFormChange({ slidesMovieUrl: data.url });
      if (movieInputRef.current) movieInputRef.current.value = '';
    } catch (uploadError) {
      console.error('Error uploading movie:', uploadError);
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error occurred';
      setMovieUploadError(errorMessage);
      if (movieInputRef.current) movieInputRef.current.value = '';
    } finally {
      setIsUploadingMovie(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-gray-400">Slides Movie URL (optional)</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={slidesMovieUrl}
          onChange={(e) => onFormChange({ slidesMovieUrl: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-300 bg-black"
          placeholder="Slides movie URL"
        />
        <div className="flex items-center gap-1">
          <input ref={movieInputRef} type="file" accept="video/*" onChange={handleMovieSelect} style={{display: 'none'}} />
          <button
            type="button"
            onClick={() => movieInputRef.current?.click()}
            disabled={isUploadingMovie}
            className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
          >
            {isUploadingMovie ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
      {movieUploadError && <p className="text-red-600 text-xs">{movieUploadError}</p>}
    </div>
  );
};

export default SlidesMovieUpload;
