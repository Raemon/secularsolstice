'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Program } from '../programs/types';
import FeedbackItem, { gridCols } from './components/FeedbackItem';
import FeedbackDetail from './components/FeedbackDetail';
import UsernameInput from './components/UsernameInput';
import ProgramTitle from './components/ProgramTitle';
import PerformerCheckbox from './components/PerformerCheckbox';
import Link from 'next/link';
import { useUser } from '../contexts/UserContext';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

export type FullVersion = {
  id: string;
  songId: string;
  label: string;
  createdAt: string;
  content?: string | null;
};

type Comment = {
  id: string;
  version_id: string;
  content: string;
  user_id: string | null;
  created_at: string;
};

type Vote = {
  version_id: string;
  weight: number;
  type: string;
  category: string;
  created_at: string;
};

type SimpleProgramProps = {
  initialProgramId?: string;
};

type PrivacyMode = 'private' | 'anonymous' | 'public';

export const ProgramFeedback = ({ initialProgramId }: SimpleProgramProps) => {
  const { userId, userName, user } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionCache, setVersionCache] = useState<Record<string, FullVersion>>({});
  const [userComments, setUserComments] = useState<Record<string, Comment[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, Vote[]>>({});
  const [showCommentsByVersionId, setShowCommentsByVersionId] = useState<Record<string, boolean>>({});

  const loadPrograms = useCallback(async () => {
    setIsLoadingPrograms(true);
    try {
      const response = await fetch('/api/programs');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load programs');
      }
      const data = await response.json();
      setPrograms(data.programs || []);
      setDataError(null);
    } catch (err) {
      console.error('Failed to load programs:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to load programs');
    } finally {
      setIsLoadingPrograms(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const loadVersionOptions = useCallback(async () => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch('/api/song-versions');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load song versions');
      }
      const data = await response.json();
      const versionsData = data.versions || [];
      setVersions(versionsData);
      setDataError(null);
    } catch (err) {
      console.error('Failed to load song versions:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to load song versions');
    } finally {
      setIsLoadingVersions(false);
    }
  }, []);

  useEffect(() => {
    loadVersionOptions();
  }, [loadVersionOptions]);

  useEffect(() => {
    if (versions.length === 0) return;
    const loadVersionsContent = async () => {
      try {
        const versionIds = versions.map(v => v.id);
        const response = await fetch('/api/songs/versions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionIds })
        });
        if (response.ok) {
          const data = await response.json();
          setVersionCache(data.versions || {});
        }
      } catch (err) {
        console.error('Failed to load version content:', err);
      }
    };
    loadVersionsContent();
  }, [versions]);

  const loadUserFeedback = useCallback(async () => {
    if (!selectedProgramId || !userId) return;
    try {
      const response = await fetch(`/api/programs/user-feedback?programId=${selectedProgramId}&userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load user feedback');
      }
      const data = await response.json();
      const commentsMap: Record<string, Comment[]> = {};
      data.comments?.forEach((comment: Comment) => {
        if (!commentsMap[comment.version_id]) {
          commentsMap[comment.version_id] = [];
        }
        commentsMap[comment.version_id].push(comment);
      });
      const votesMap: Record<string, Vote[]> = {};
      data.votes?.forEach((vote: Vote) => {
        if (!votesMap[vote.version_id]) {
          votesMap[vote.version_id] = [];
        }
        votesMap[vote.version_id].push(vote);
      });
      setUserComments(commentsMap);
      setUserVotes(votesMap);
    } catch (err) {
      console.error('Failed to load user feedback:', err);
    }
  }, [selectedProgramId, userId]);

  useEffect(() => {
    loadUserFeedback();
  }, [loadUserFeedback]);

  const loading = isLoadingPrograms || isLoadingVersions;

  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    programs.forEach((program) => {
      map[program.id] = program;
    });
    return map;
  }, [programs]);

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

  const selectedProgram = selectedProgramId ? programMap[selectedProgramId] ?? null : null;

  useEffect(() => {
    if (!selectedProgramId && programs.length > 0) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Loading programs...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-600">Error: {dataError}</p>
        </div>
      </div>
    );
  }

  if (!programs.length) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">No programs yet.</p>
        </div>
      </div>
    );
  }

  const selectedVersion = selectedVersionId ? versionMap[selectedVersionId] : null;

  const handleSelectProgram = (programId: string) => {
    if (selectedProgramId === programId) {
      setSelectedProgramId(null);
      setSelectedVersionId(null);
    } else {
      setSelectedProgramId(programId);
      setSelectedVersionId(null);
    }
  };

  const handleCommentPosted = (versionId: string) => (comment: Comment) => {
    setUserComments(prev => ({
      ...prev,
      [versionId]: [comment]
    }));
  };

  if (!selectedProgramId) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">No program selected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex gap-4">
        <div className="flex flex-col gap-1 w-full lg:max-w-4xl mx-auto">
          <ProgramTitle title={selectedProgram?.title || ''} suffix="Feedback" />
          <p className="text-center text-white mt-9 mb-2">
            All responses are <span className="text-primary">public and updated immediately,</span> (including comments).
          </p>
          <p className="text-center text-gray-300 text-[13px]">
            Enter your name if you want admins to know who you are. You can edit your feedback later.
          </p>
          <div className="flex justify-center items-center mt-4">
            <label htmlFor="username-input" className="text-sm text-gray-300 mr-2">
              Your name:
            </label>
            <UsernameInput />
          </div>
          <div className="flex justify-center items-center flex-col gap-2 mb-4">
            <PerformerCheckbox programId={selectedProgramId} /> 
            {user?.performed_program_ids.includes(selectedProgramId) && <div className="text-gray-500 text-[13px]">(Please enter your name, or at least something only a performer would know)</div>}
          </div>
          {/* <div className="mb-4">
            <select 
              value={selectedProgramId || ''}
              onChange={(e) => handleSelectProgram(e.target.value)}
              className="bg-black text-white px-2 py-1 text-sm"
            >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.title}</option>
            ))}
            </select>
          </div> */}
          <div>
            {selectedProgram?.elementIds && selectedProgram.elementIds.length > 0 && (
              <>
                <div className="hidden md:grid grid-cols-[20px_275px_310px_200px_1fr] items-center gap-4 text-sm px-2 py-1 border-b border-gray-700 text-gray-400 font-medium">
                  <div>Song/Speech</div>
                  <div className="pl-1">Quality</div>
                  <div className="pl-2">Singability</div>
                  <div className="pl-2">Comments</div>
                </div>
                {selectedProgram.elementIds.map((elementId, index) => {
                  const version = versionMap[elementId];
                  const existingComment = userComments[elementId]?.[0] || null;
                  const votes = userVotes[elementId] || [];
                  return (
                    <FeedbackItem
                      key={elementId}
                      version={version}
                      index={index}
                      onClick={() => setSelectedVersionId(elementId)}
                      isSelected={selectedVersionId === elementId}
                      existingComment={existingComment}
                      onCommentPosted={handleCommentPosted(elementId)}
                      userVotes={votes}
                      showComments={showCommentsByVersionId[elementId] !== false}
                      onToggleComments={() => setShowCommentsByVersionId(prev => ({ ...prev, [elementId]: prev[elementId] === false }))}
                    />
                  );
                })}
              </>
            )}
            {selectedProgram?.programIds.map((subProgramId) => {
              const subProgram = programMap[subProgramId];
              if (!subProgram) return null;
              return (
                <div key={subProgramId} className="mb-3">
                  <div className="font-georgia text-2xl text-center my-12">{subProgram.title}</div>
                  <div className="hidden md:grid gap-4 text-sm px-2 py-1 border-b border-gray-700 text-gray-400 font-medium" style={{ gridTemplateColumns: gridCols }}>
                    <div>Song/Speech</div>
                    <div className="pl-1">Quality</div>
                    <div className="pl-2">Singability</div>
                    <div className="pl-2">Comments</div>
                  </div>
                  <div className="flex flex-col">
                    {subProgram.elementIds.map((elementId, index) => {
                      const version = versionMap[elementId];
                      const existingComment = userComments[elementId]?.[0] || null;
                      const votes = userVotes[elementId] || [];
                      return (
                        <FeedbackItem
                          key={elementId}
                          version={version}
                          content={versionCache[elementId]?.content || ''}
                          index={index}
                          onClick={() => setSelectedVersionId(elementId)}
                          isSelected={selectedVersionId === elementId}
                          existingComment={existingComment}
                          onCommentPosted={handleCommentPosted(elementId)}
                          userVotes={votes}
                          showComments={showCommentsByVersionId[elementId] !== false}
                          onToggleComments={() => setShowCommentsByVersionId(prev => ({ ...prev, [elementId]: prev[elementId] === false }))}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-gray-200 mt-12">
            Responses are public and updated immediately. (Including comments).
          </p>
          <p className="text-center text-gray-300 text-sm">
            You can enter your name if you want admins to know who you are.
          </p>
          <div className="flex justify-center items-center my-4 text-sm text-gray-400 mb-12">
            Current username: <UsernameInput />
          </div>
          <div className="flex justify-center items-center my-4 text-gray-400 mb-12">
            <Link href={`/programs/${selectedProgram?.id}/results`} className="text-primary hover:border-white block text-center mb-24 border border-gray-700 px-4 py-2 rounded-md">
              View Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
