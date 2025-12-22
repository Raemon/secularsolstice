'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/app/contexts/UserContext';
import Link from 'next/link';

const CreateBackupButton = ({ userId }: { userId: string }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setBackupStatus(null);
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
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setBackupStatus({ success: true, message: `Downloaded ${filename} (${songsCount} songs, ${versionsCount} versions)` });
    } catch (err: unknown) {
      console.error('Backup failed:', err);
      setBackupStatus({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCreateBackup}
        disabled={isCreating}
        className={`text-sm px-3 py-1 border border-gray-600 rounded ${isCreating ? 'opacity-50 cursor-not-allowed' : 'text-gray-200 hover:bg-gray-800'}`}
      >
        {isCreating ? 'Creating...' : 'Create Backup'}
      </button>
      {backupStatus && (
        <span className={`text-xs ${backupStatus.success ? 'text-green-400' : 'text-red-400'}`}>
          {backupStatus.message}
        </span>
      )}
    </div>
  );
};

interface Admin {
  id: string;
  username: string | null;
  created_at: string;
}

interface User {
  id: string;
  username: string | null;
}

const TOOL_LINKS = [
  { href: '/blobs', label: 'Blob Storage' },
  { href: '/bulk-create-versions', label: 'Bulk Create Versions' },
  { href: '/chord-player', label: 'Chord Player' },
  { href: '/chordmark-converter', label: 'Chordmark Converter' },
  { href: '/comments', label: 'All Comments' },
  { href: '/votes', label: 'All Votes' },
  { href: '/test-lilypond', label: 'Test Lilypond' },
  { href: '/tools/import-secular-solstice', label: 'Import Secular Solstice' },
];

const AdminPage = () => {
  const { userId, isAdmin, loading: userLoading } = useUser();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!userId || !isAdmin) return;
    const fetchAdmins = async () => {
      try {
        const response = await fetch(`/api/admin/users?requestingUserId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch admins');
        const data = await response.json();
        setAdmins(data);
      } catch (err) {
        console.error('Error fetching admins:', err);
        setError('Failed to load admins');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdmins();
  }, [userId, isAdmin]);

  const fetchAllUsers = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/admin/users/all?requestingUserId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setAllUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (showUserSearch && allUsers.length === 0) fetchAllUsers();
  }, [showUserSearch, allUsers.length, fetchAllUsers]);

  const handleAddAdmin = async (targetUserId: string) => {
    if (!userId) return;
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, requestingUserId: userId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add admin');
      }
      const newAdmin = await response.json();
      setAdmins(prev => [...prev, newAdmin]);
      setShowUserSearch(false);
      setSearchQuery('');
    } catch (err: unknown) {
      console.error('Error adding admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (targetUserId: string) => {
    if (!userId) return;
    if (targetUserId === userId) {
      setError("You can't remove yourself as admin");
      return;
    }
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, requestingUserId: userId }),
      });
      if (!response.ok) throw new Error('Failed to remove admin');
      setAdmins(prev => prev.filter(a => a.id !== targetUserId));
    } catch (err) {
      console.error('Error removing admin:', err);
      setError('Failed to remove admin');
    }
  };

  if (userLoading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8 text-gray-400">You must be an admin to view this page.</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  const filteredUsers = allUsers.filter(u =>
    !admins.some(a => a.id === u.id) &&
    (u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || u.id.includes(searchQuery))
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Admins</h2>
        <div className="space-y-2 mb-4">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center gap-4 py-1">
              <span className="text-gray-300">{admin.username || admin.id}</span>
              {admin.id !== userId && (
                <button onClick={() => handleRemoveAdmin(admin.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              )}
            </div>
          ))}
        </div>
        {showUserSearch ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search by username or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (allUsers.length === 0) fetchAllUsers(); }}
              className="bg-gray-800 text-white px-3 py-1 text-sm w-64"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.slice(0, 10).map(user => (
                <div key={user.id} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">{user.username || user.id}</span>
                  <button onClick={() => handleAddAdmin(user.id)} className="text-xs text-blue-400 hover:text-blue-300">Add</button>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowUserSearch(false); setSearchQuery(''); }} className="text-xs text-gray-500 hover:text-gray-400">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowUserSearch(true)} className="text-sm text-blue-400 hover:text-blue-300">+ Add Admin</button>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Tools</h2>
        <div className="space-y-1">
          {TOOL_LINKS.map(link => (
            <div key={link.href}>
              <Link href={link.href} className="text-blue-400 hover:text-blue-300 hover:underline">{link.label}</Link>
            </div>
          ))}
        </div>
      </section>

      {userId && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Backup</h2>
          <p className="text-gray-400 text-sm mb-2">Download a zip file containing all songs and versions.</p>
          <CreateBackupButton userId={userId} />
        </section>
      )}
    </div>
  );
};

export default AdminPage;
