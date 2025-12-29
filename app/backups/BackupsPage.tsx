'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/app/contexts/UserContext';
import type { BackupInfo } from '@/app/api/admin/backup/list/route';
import type { BackupContents } from '@/app/api/admin/backup/contents/route';
import type { StatsResponse } from '@/app/api/admin/stats/route';
import type { RestoreProgress, OrphanedRefInfo } from '@/app/api/admin/backup/restore/route';
import ChevronArrow from '@/app/components/ChevronArrow';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatShortDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const BackupsPage = () => {
  const { userId, isAdmin, loading: userLoading } = useUser();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<{ step: string; percent?: number } | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [orphanedRefs, setOrphanedRefs] = useState<OrphanedRefInfo[]>([]);
  const [expandedBackup, setExpandedBackup] = useState<string | null>(null);
  const [backupContents, setBackupContents] = useState<Record<string, BackupContents>>({});
  const [loadingContents, setLoadingContents] = useState<string | null>(null);
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const fetchBackups = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/admin/backup/list?requestingUserId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch backups');
      const data = await response.json();
      setBackups(data.backups);
    } catch (err) {
      console.error('Error fetching backups:', err);
      setStatus({ type: 'error', message: 'Failed to load backups' });
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

  const handleExpandBackup = async (filename: string) => {
    if (expandedBackup === filename) {
      setExpandedBackup(null);
      return;
    }
    setExpandedBackup(filename);
    if (backupContents[filename]) return; // Already loaded
    if (!userId) return;
    setLoadingContents(filename);
    try {
      const response = await fetch(`/api/admin/backup/contents?requestingUserId=${userId}&filename=${encodeURIComponent(filename)}`);
      if (!response.ok) throw new Error('Failed to fetch backup contents');
      const data = await response.json();
      setBackupContents(prev => ({ ...prev, [filename]: data }));
    } catch (err) {
      console.error('Error fetching backup contents:', err);
    } finally {
      setLoadingContents(null);
    }
  };

  const toggleSongExpanded = (songId: string) => {
    setExpandedSongs(prev => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const handleCreateBackup = async () => {
    if (!userId) return;
    setIsCreating(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/backup?requestingUserId=${userId}`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create backup');
      }
      const blob = await response.blob();
      const filename = response.headers.get('X-Backup-Filename') || `songs-export-${new Date().toISOString().split('T')[0]}.zip`;
      const songsCount = response.headers.get('X-Songs-Count');
      const versionsCount = response.headers.get('X-Versions-Count');
      const programsCount = response.headers.get('X-Programs-Count');
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setStatus({ type: 'success', message: `Downloaded ${filename} (${songsCount} songs, ${versionsCount} versions, ${programsCount} programs)` });
      fetchBackups();
    } catch (err: unknown) {
      console.error('Backup failed:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!userId) return;
    const confirmed = window.confirm(
      `Are you sure you want to restore from "${filename}"?\n\nThis will DELETE all current songs, versions, and programs and replace them with the backup data. This action cannot be undone.`
    );
    if (!confirmed) return;

    setRestoringFile(filename);
    setRestoreProgress(null);
    setStatus(null);
    setOrphanedRefs([]);
    try {
      const response = await fetch(`/api/admin/backup/restore?requestingUserId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore backup');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6)) as RestoreProgress;
              const percent = data.progress ? Math.round((data.progress.current / data.progress.total) * 100) : undefined;
              setRestoreProgress({ step: data.step, percent });
            if (data.completed) {
              if (data.error) {
                setStatus({ type: 'error', message: data.error });
              } else if (data.details) {
                const orphans = data.details.orphanedRefs || [];
                setOrphanedRefs(orphans);
                const orphanMsg = orphans.length > 0
                  ? ` (${orphans.filter(o => o.fixed).length}/${orphans.length} orphaned refs fixed)`
                  : '';
                setStatus({
                  type: 'success',
                  message: `Restored: ${data.details.songs} songs, ${data.details.versions} versions, ${data.details.programs} programs${orphanMsg}`,
                });
                fetchStats();
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error('Restore failed:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setRestoringFile(null);
      setRestoreProgress(null);
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
      <h1 className="text-2xl font-bold mb-4">Backups</h1>

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

      {orphanedRefs.length > 0 && (
        <div className="mb-4 p-2 text-sm bg-yellow-900/20">
          <div className="text-yellow-400 mb-1">Orphaned References ({orphanedRefs.filter(o => o.fixed).length}/{orphanedRefs.length} fixed):</div>
          <div className="max-h-32 overflow-y-auto text-xs space-y-0.5">
            {orphanedRefs.map((ref, i) => (
              <div key={i} className={ref.fixed ? 'text-green-400' : 'text-red-400'}>
                {ref.fixed ? '✓' : '✗'} {ref.versionLabel}: {ref.refType} → {ref.missingRefId.slice(0, 8)}...
                {ref.error && <span className="text-red-300 ml-1">({ref.error})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Create New Backup</h2>
        <p className="text-gray-400 text-sm mb-2">Download a zip file containing all songs, versions, blob files, and programs.</p>
        <button
          onClick={handleCreateBackup}
          disabled={isCreating}
          className={`text-sm px-3 py-1 border border-gray-600 rounded ${isCreating ? 'opacity-50 cursor-not-allowed' : 'text-gray-200 hover:bg-gray-800'}`}
        >
          {isCreating ? 'Creating...' : 'Create Backup'}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Available Backups</h2>
        {isLoading ? (
          <div className="text-gray-400">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="text-gray-500">No backups found in the backups/ directory.</div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => {
              const isExpanded = expandedBackup === backup.filename;
              const contents = backupContents[backup.filename];
              const isLoadingThis = loadingContents === backup.filename;
              return (
                <div key={backup.filename} className="border-b border-gray-700">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1 flex items-center cursor-pointer" onClick={() => handleExpandBackup(backup.filename)}>
                      <ChevronArrow isExpanded={isExpanded} className="text-gray-500 mr-2" />
                      <span className="text-gray-200">{backup.filename}</span>
                      <span className="text-gray-500 text-sm ml-3">{formatFileSize(backup.size)}</span>
                      <span className="text-gray-500 text-sm ml-3">{formatDate(backup.createdAt)}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(backup.filename); }}
                      disabled={restoringFile !== null}
                      className={`text-sm px-3 py-1 border border-red-700 rounded ${restoringFile === backup.filename ? 'opacity-50 cursor-not-allowed' : 'text-red-400 hover:bg-red-900/30'}`}
                    >
                      {restoringFile === backup.filename
                        ? (restoreProgress ? `${restoreProgress.step}${restoreProgress.percent !== undefined ? ` (${restoreProgress.percent}%)` : ''}` : 'Restoring...')
                        : 'Restore'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="pl-6 pb-3 text-sm">
                      {isLoadingThis ? (
                        <span className="text-gray-500">Loading contents...</span>
                      ) : contents ? (
                        <div>
                          <div className="text-gray-400 mb-1">{contents.songs.length} songs, {contents.programCount} programs</div>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {contents.songs.map(song => {
                              const isSongExpanded = expandedSongs.has(song.id);
                              return (
                                <div key={song.id}>
                                  <div className="flex items-center cursor-pointer hover:text-gray-200 text-gray-400" onClick={() => toggleSongExpanded(song.id)}>
                                    <ChevronArrow isExpanded={isSongExpanded} className="text-gray-600 mr-1" />
                                    <span>{song.title}</span>
                                    <span className="text-gray-600 ml-2">({song.versions.length})</span>
                                  </div>
                                  {isSongExpanded && (
                                    <div className="pl-5 text-gray-500">
                                      {song.versions.map(v => (
                                        <div key={v.id}>- {v.label}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default BackupsPage;
