'use client';

import { useEffect, useState } from 'react';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

type SongVersion = {
  id: string;
  songId: string;
  label: string;
  createdAt: string;
  content?: string | null;
};

type SimpleDetailPanelProps = {
  version: VersionOption;
  onClose: () => void;
};

const SimpleDetailPanel = ({ version, onClose }: SimpleDetailPanelProps) => {
  const [fullVersion, setFullVersion] = useState<SongVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVersion = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/songs/versions/${version.id}`);
        if (!response.ok) {
          throw new Error('Failed to load version');
        }
        const data = await response.json();
        setFullVersion(data.version);
      } catch (err) {
        console.error('Failed to load version:', err);
        setError(err instanceof Error ? err.message : 'Failed to load version');
      } finally {
        setLoading(false);
      }
    };
    loadVersion();
  }, [version.id]);

  const isSpeech = version.tags?.includes('speech');
  const content = fullVersion?.content || '';

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`font-georgia text-xl ${isSpeech ? 'italic' : ''}`}>
          {version.songTitle}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm px-2"
        >
          ×
        </button>
      </div>
      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div className="whitespace-pre-wrap font-mono text-sm">
          {content || 'No content available'}
        </div>
      )}
    </div>
  );
};

export default SimpleDetailPanel;

