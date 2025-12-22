'use client';

import { useEffect, useState } from 'react';
import ChevronArrow from '@/app/components/ChevronArrow';

interface BlobItem {
  pathname: string;
  url: string;
  size: number;
  uploadedAt: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileType = (pathname: string): 'image' | 'video' | 'audio' | 'pdf' | 'text' | null => {
  const ext = pathname.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'md', 'json', 'xml', 'csv'].includes(ext)) return 'text';
  return null;
};

const FilePreview = ({ blob }: { blob: BlobItem }) => {
  const fileType = getFileType(blob.pathname);
  if (!fileType) return <div className="text-gray-500 text-sm py-2">Cannot preview this file type</div>;
  switch (fileType) {
    case 'image':
      return <img src={blob.url} alt={blob.pathname} className="max-w-full max-h-96 object-contain my-2" />;
    case 'video':
      return <video src={blob.url} controls className="max-w-full max-h-96 my-2" />;
    case 'audio':
      return <audio src={blob.url} controls className="my-2" />;
    case 'pdf':
      return <iframe src={blob.url} className="w-full h-96 my-2" />;
    case 'text':
      return <TextPreview url={blob.url} />;
    default:
      return null;
  }
};

const TextPreview = ({ url }: { url: string }) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(setContent)
      .catch(() => setError(true));
  }, [url]);
  if (error) return <div className="text-red-400 text-sm py-2">Failed to load text</div>;
  if (content === null) return <div className="text-gray-400 text-sm py-2">Loading...</div>;
  return <pre className="bg-gray-900 p-2 text-xs overflow-auto max-h-64 my-2 whitespace-pre-wrap">{content.slice(0, 5000)}</pre>;
};

const BlobRow = ({ blob }: { blob: BlobItem }) => {
  const [expanded, setExpanded] = useState(false);
  const fileType = getFileType(blob.pathname);
  return (
    <>
      <tr className="border-t border-gray-800">
        <td className="py-1">
          <div className="flex items-center gap-2">
            {fileType ? (
              <ChevronArrow isExpanded={expanded} className="cursor-pointer text-xs opacity-50 hover:opacity-100" onClick={() => setExpanded(!expanded)} />
            ) : (
              <span className="w-3" />
            )}
            <a href={blob.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {blob.pathname}
            </a>
          </div>
        </td>
        <td className="py-1 text-gray-400">{formatBytes(blob.size)}</td>
        <td className="py-1 text-gray-400">{new Date(blob.uploadedAt).toLocaleDateString()}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={3} className="pb-4">
            <FilePreview blob={blob} />
          </td>
        </tr>
      )}
    </>
  );
};

type SortColumn = 'path' | 'size' | 'uploaded';
type SortDirection = 'asc' | 'desc';

const SortableHeader = ({ column, label, sortColumn, sortDirection, onSort }: {
  column: SortColumn; label: string; sortColumn: SortColumn; sortDirection: SortDirection; onSort: (col: SortColumn) => void;
}) => {
  const isActive = sortColumn === column;
  return (
    <th className="pb-2 cursor-pointer select-none hover:text-gray-200" onClick={() => onSort(column)}>
      {label} {isActive && (sortDirection === 'asc' ? '▲' : '▼')}
    </th>
  );
};

const BlobsPage = () => {
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('uploaded');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchBlobs = async () => {
      try {
        const response = await fetch('/api/blobs');
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch blobs');
        }
        const data = await response.json();
        setBlobs(data.blobs || []);
      } catch (err) {
        console.error('Error fetching blobs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blobs');
      } finally {
        setLoading(false);
      }
    };
    fetchBlobs();
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedBlobs = [...blobs].sort((a, b) => {
    let cmp = 0;
    switch (sortColumn) {
      case 'path': cmp = a.pathname.localeCompare(b.pathname); break;
      case 'size': cmp = a.size - b.size; break;
      case 'uploaded': cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(); break;
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  const totalSize = blobs.reduce((acc, b) => acc + b.size, 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Blob Storage</h1>
      <p className="text-gray-400 text-sm mb-4">{blobs.length} files • {formatBytes(totalSize)} total</p>
      {blobs.length === 0 ? (
        <p className="text-gray-500">No blobs found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <SortableHeader column="path" label="Path" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader column="size" label="Size" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader column="uploaded" label="Uploaded" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedBlobs.map((blob) => <BlobRow key={blob.pathname} blob={blob} />)}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BlobsPage;
