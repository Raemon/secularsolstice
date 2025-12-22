'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import Link from 'next/link';

type Version = {
  id: string;
  song_id: string;
  label: string;
  song_title: string;
  tags: string[];
};

type Vote = {
  version_id: string;
  weight: number;
  type: string;
  category: string;
  user_id: string;
  created_at: string;
};

type Comment = {
  id: string;
  version_id: string;
  content: string;
  user_id: string;
  created_at: string;
};

type UserFeedback = {
  userId: string;
  username: string | null;
  votes: Vote[];
  comments: Comment[];
};

type Program = {
  id: string;
  title: string;
};

const AdminFeedbackPage = () => {
  const { userId, isAdmin, loading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  const [program, setProgram] = useState<Program | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [orderedVersionIds, setOrderedVersionIds] = useState<string[]>([]);
  const [users, setUsers] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuality, setShowQuality] = useState(true);
  const [showSingability, setShowSingability] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    if (!userId || !isAdmin || !programId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/programs/admin-feedback?programId=${programId}&requestingUserId=${userId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch feedback');
      }
      const data = await response.json();
      setProgram(data.program);
      setVersions(data.versions || []);
      setOrderedVersionIds(data.orderedVersionIds || []);
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isAdmin, programId]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const versionMap = useMemo(() => {
    const map: Record<string, Version> = {};
    versions.forEach(v => { map[v.id] = v; });
    return map;
  }, [versions]);

  // Create lookup maps for user feedback by version
  const userFeedbackByVersion = useMemo(() => {
    const map: Record<string, Record<string, { qualityVotes: Vote[]; singabilityVotes: Vote[]; comments: Comment[] }>> = {};
    orderedVersionIds.forEach(vId => { map[vId] = {}; });
    users.forEach(user => {
      const key = user.userId || 'anonymous';
      user.votes.forEach(vote => {
        if (!map[vote.version_id]) map[vote.version_id] = {};
        if (!map[vote.version_id][key]) map[vote.version_id][key] = { qualityVotes: [], singabilityVotes: [], comments: [] };
        if (vote.category === 'quality') map[vote.version_id][key].qualityVotes.push(vote);
        if (vote.category === 'singability') map[vote.version_id][key].singabilityVotes.push(vote);
      });
      user.comments.forEach(comment => {
        if (!map[comment.version_id]) map[comment.version_id] = {};
        if (!map[comment.version_id][key]) map[comment.version_id][key] = { qualityVotes: [], singabilityVotes: [], comments: [] };
        map[comment.version_id][key].comments.push(comment);
      });
    });
    return map;
  }, [orderedVersionIds, users]);

  if (userLoading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8 text-gray-400">You must be an admin to view this page.</div>;
  }

  if (!programId) {
    return <div className="p-8 text-gray-400">No programId provided.</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading feedback...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  const renderQualityDots = (votes: Vote[]) => {
    if (votes.length === 0) return null;
    return (
      <div className="flex items-center justify-center gap-0.5 flex-wrap">
        {votes.sort((a, b) => b.weight - a.weight).map((vote, i) => {
          const size = Math.abs(vote.weight) === 3 ? 10 : 5;
          const color = vote.weight > 0 ? 'var(--primary)' : vote.weight === 0 ? '#fff' : 'var(--secondary)';
          const tooltip = `${vote.type} (${vote.weight > 0 ? '+' : ''}${vote.weight})`;
          return (
            <span
              key={i}
              className="inline-block rounded-full"
              title={tooltip}
              style={{ width: `${size}px`, height: `${size}px`, backgroundColor: color }}
            />
          );
        })}
      </div>
    );
  };

  const renderSingability = (votes: Vote[]) => {
    if (votes.length === 0) return null;
    const vote = votes[0];
    const color = vote.weight === 1 ? 'var(--secondary)' : vote.weight === 2 ? '#fff' : vote.weight === 3 ? 'var(--primary)' : '#888';
    return <span className="text-xs" style={{ color }} title={vote.type}>{vote.weight}</span>;
  };

  const renderCommentCell = (comments: Comment[]) => {
    if (comments.length === 0) return null;
    return (
      <div style={{ width: '250px', minWidth: '250px' }}>
        {comments.map(c => (
          <div key={c.id} className="text-gray-300 text-xs py-0.5" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {c.content}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/feedback/${programId}`} className="text-gray-400 hover:text-white">← Back to Feedback</Link>
        <h1 className="text-xl font-bold">{program?.title} - Admin Feedback View</h1>
      </div>
      <div className="flex items-center gap-4 text-sm mb-4">
        <span className="text-gray-400">{users.length} users have provided feedback</span>
        <label className="flex items-center gap-1 text-gray-300 cursor-pointer">
          <input type="checkbox" checked={showQuality} onChange={e => setShowQuality(e.target.checked)} />
          Quality
        </label>
        <label className="flex items-center gap-1 text-gray-300 cursor-pointer">
          <input type="checkbox" checked={showSingability} onChange={e => setShowSingability(e.target.checked)} />
          Singability
        </label>
        <label className="flex items-center gap-1 text-gray-300 cursor-pointer">
          <input type="checkbox" checked={showComments} onChange={e => setShowComments(e.target.checked)} />
          Comments
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-2 text-gray-400 font-medium sticky left-0 bg-gray-950 min-w-[180px] z-10">Song</th>
              {users.map(user => {
                const key = user.userId || 'anonymous';
                const colSpan = (showQuality ? 1 : 0) + (showSingability ? 1 : 0) + (showComments ? 1 : 0);
                if (colSpan === 0) return null;
                const isHovered = hoveredUser === key;
                return (
                  <th key={key} colSpan={colSpan} className="border-l border-gray-700 h-24 align-bottom relative" style={{ minWidth: `${colSpan * 30}px`, backgroundColor: isHovered ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : undefined }} onMouseEnter={() => setHoveredUser(key)} onMouseLeave={() => setHoveredUser(null)}>
                    <span className={`absolute bottom-0 left-1/2 whitespace-nowrap font-medium text-xs ${isHovered ? 'text-yellow-300' : 'text-white'}`} style={{ transform: 'rotate(-45deg)', transformOrigin: 'bottom left' }}>
                      {user.username || user.userId?.slice(0, 8) || 'Anon'}
                    </span>
                  </th>
                );
              })}
            </tr>
            <tr className="border-b border-gray-600 text-xs text-gray-500">
              <th className="sticky left-0 bg-gray-950 z-10"></th>
              {users.map(user => {
                const key = user.userId || 'anonymous';
                const isHovered = hoveredUser === key;
                return (
                  <React.Fragment key={key}>
                    {showQuality && <th className="py-1 px-1 border-l border-gray-700" style={{ backgroundColor: isHovered ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : undefined }} onMouseEnter={() => setHoveredUser(key)} onMouseLeave={() => setHoveredUser(null)}>Qual</th>}
                    {showSingability && <th className="py-1 px-1" style={{ backgroundColor: isHovered ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : undefined }} onMouseEnter={() => setHoveredUser(key)} onMouseLeave={() => setHoveredUser(null)}>Sing</th>}
                    {showComments && <th className="py-1 px-1" style={{ backgroundColor: isHovered ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : undefined }} onMouseEnter={() => setHoveredUser(key)} onMouseLeave={() => setHoveredUser(null)}>💬</th>}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {orderedVersionIds.map(versionId => {
              const version = versionMap[versionId];
              if (!version) return null;
              return (
                <tr key={versionId} className="border-b border-gray-800" onMouseEnter={() => setHoveredRow(versionId)} onMouseLeave={() => setHoveredRow(null)}>
                  <td className="py-1 px-2 text-gray-300 sticky left-0 z-10 font-georgia" style={{ backgroundColor: hoveredRow === versionId ? 'color-mix(in srgb, var(--secondary) 20%, #030712)' : '#030712' }}>{version.song_title}</td>
                  {users.map(user => {
                    const key = user.userId || 'anonymous';
                    const feedback = userFeedbackByVersion[versionId]?.[key] || { qualityVotes: [], singabilityVotes: [], comments: [] };
                    const isColHovered = hoveredUser === key;
                    const isRowHovered = hoveredRow === versionId;
                    const bgColor = isColHovered ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : isRowHovered ? 'color-mix(in srgb, var(--secondary) 20%, transparent)' : undefined;
                    return (
                      <React.Fragment key={key}>
                        {showQuality && <td className="py-1 px-1 border-l border-gray-800 text-center" style={{ backgroundColor: bgColor }} onMouseEnter={() => setHoveredUser(key)} onMouseLeave={() => setHoveredUser(null)}>{renderQualityDots(feedback.qualityVotes)}</td>}
                        {showSingability && <td className="py-1 px-1 text-center" style={{ backgroundColor: bgColor }} onMouseEnter={() => setHoveredUser(key)} onMouseLeave={() => setHoveredUser(null)}>{renderSingability(feedback.singabilityVotes)}</td>}
                        {showComments && <td className="py-1 px-1" style={{ backgroundColor: bgColor }} onMouseEnter={() => setHoveredUser(key)} onMouseLeave={() => setHoveredUser(null)}>{renderCommentCell(feedback.comments)}</td>}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFeedbackPage;