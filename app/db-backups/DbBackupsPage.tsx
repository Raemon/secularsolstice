'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/app/contexts/UserContext';
import type { BackupInfo } from '@/lib/r2';
import type { StatsResponse } from '@/app/api/admin/stats/route';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatShortDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const GITHUB_ACTIONS_RESTORE_URL = 'https://github.com/Raemon/secularsolstice/actions/workflows/db-restore.yml';

const DbBackupsPage = () => {
  const { userId, isAdmin, loading: userLoading } = useUser();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const fetchBackups = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/db-backup?requestingUserId=${userId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || 'Failed to fetch backups');
      setBackups(data.backups);
    } catch (err) {
      console.error('Error fetching backups:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load backups' });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/admin/stats?requestingUserId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && isAdmin) {
      fetchBackups();
      fetchStats();
    }
  }, [userId, isAdmin, fetchBackups, fetchStats]);

  const handleDownload = async (filename: string) => {
    if (!userId) return;
    setDownloadingFile(filename);
    try {
      const response = await fetch(`/api/db-backup/${encodeURIComponent(filename)}?requestingUserId=${userId}`);
      if (!response.ok) throw new Error('Failed to download backup');
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Download failed' });
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!userId) return;
    const confirmed = window.confirm(
      `Trigger restore from "${filename}"?\n\nThis will run a GitHub Action that:\n1. Creates a safety backup\n2. Restores from this backup\n\nYou can monitor progress in GitHub Actions.`
    );
    if (!confirmed) return;
    setRestoringFile(filename);
    setStatus(null);
    try {
      const response = await fetch(`/api/trigger-restore?requestingUserId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to trigger restore');
      setStatus({ type: 'success', message: 'Restore workflow triggered! Check GitHub Actions for progress.' });
    } catch (err) {
      console.error('Trigger failed:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setRestoringFile(null);
    }
  };

  if (userLoading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8 text-gray-400">You must be an admin to view this page.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Database Backups</h1>

      {stats && (
        <div className="text-sm text-gray-400 mb-4">
          <span>{stats.songs.count} songs (latest: {formatShortDate(stats.songs.mostRecent)})</span>
          <span className="mx-2">•</span>
          <span>{stats.versions.count} versions (latest: {formatShortDate(stats.versions.mostRecent)})</span>
          <span className="mx-2">•</span>
          <span>{stats.programs.count} programs (latest: {formatShortDate(stats.programs.mostRecent)})</span>
        </div>
      )}

      {status && (
        <div className={`mb-4 p-2 text-sm ${status.type === 'success' ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>
          {status.message}
        </div>
      )}

      <section className="mb-8">
        <p className="text-gray-400 text-sm mb-2">
          Backups are created automatically via GitHub Actions daily at 4am UTC.
        </p>
        <p className="text-gray-400 text-sm">
          Click Restore to trigger a{' '}
          <a href={GITHUB_ACTIONS_RESTORE_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            GitHub Action
          </a>{' '}
          that restores the database (creates a safety backup first).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Available Backups (Backblaze B2)</h2>
        {isLoading ? (
          <div className="text-gray-400">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="text-gray-500">No backups found. Run the GitHub Action to create your first backup.</div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div key={backup.filename} className="border-b border-gray-700 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-gray-200">{backup.filename}</span>
                    <span className="text-gray-500 text-sm ml-3">{formatFileSize(backup.size)}</span>
                    <span className="text-gray-500 text-sm ml-3">{formatDate(backup.lastModified)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(backup.filename)}
                      disabled={restoringFile !== null}
                      className={`text-sm px-3 py-1 border border-orange-700 ${restoringFile === backup.filename ? 'opacity-50 cursor-not-allowed' : 'text-orange-400 hover:bg-orange-900/30'}`}
                    >
                      {restoringFile === backup.filename ? '...' : 'Restore'}
                    </button>
                    <button
                      onClick={() => handleDownload(backup.filename)}
                      disabled={downloadingFile !== null}
                      className={`text-sm px-3 py-1 border border-gray-600 ${downloadingFile === backup.filename ? 'opacity-50 cursor-not-allowed' : 'text-gray-200 hover:bg-gray-800'}`}
                    >
                      {downloadingFile === backup.filename ? '...' : 'Download'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DbBackupsPage;
