'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@/app/user/types';
import { generateUsername } from '@/lib/usernameGenerator';

type UserContextType = {
  user: User | null;
  userId: string | null;
  userName: string;
  setUserFromAuth: (user: User) => void;
  logout: () => void;
  canVoteAndComment: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  loading: boolean;
  togglePerformedProgram: (programId: string) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserNameState] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();

  // Initial user fetch - runs once on mount
  useEffect(() => {
    const fetchExistingUser = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const response = await fetch(`/api/users?userId=${userId}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setUserNameState(userData.username || '');
          } else {
            localStorage.removeItem('userId');
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    fetchExistingUser();
  }, []);

  // Auto-create guest user on /feedback page if no user exists
  useEffect(() => {
    if (!initialized || user || loading) return;
    const isFeedbackPage = pathname?.startsWith('/feedback');
    if (!isFeedbackPage) return;

    const createGuestUser = async () => {
      try {
        const existingUsername = localStorage.getItem('userName');
        let usernameToUse = existingUsername || generateUsername();
        let response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameToUse }),
        });
        if (response.status === 409) {
          usernameToUse = generateUsername();
          response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameToUse }),
          });
        }
        if (response.ok) {
          const newUser = await response.json();
          setUser(newUser);
          localStorage.setItem('userId', newUser.id);
          setUserNameState(newUser.username || '');
          if (newUser.username) {
            localStorage.setItem('userName', newUser.username);
          }
        }
      } catch (error) {
        console.error('Error creating guest user:', error);
      }
    };
    createGuestUser();
  }, [initialized, user, loading, pathname]);

  const canVoteAndComment = !!user;
  const canEdit = !!user?.id
  const isAdmin = user?.is_admin ?? false;

  const setUserFromAuth = (newUser: User) => {
    setUser(newUser);
    setUserNameState(newUser.username || '');
    localStorage.setItem('userId', newUser.id);
    if (newUser.username) {
      localStorage.setItem('userName', newUser.username);
    }
  };

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setUser(null);
    setUserNameState('');
    window.location.reload();
  };

  const togglePerformedProgram = async (programId: string) => {
    if (!user) return;
    
    const currentIds = user.performed_program_ids || [];
    const newIds = currentIds.includes(programId)
      ? currentIds.filter(id => id !== programId)
      : [...currentIds, programId];
    
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, performedProgramIds: newIds }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating performed programs:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, userId: user?.id || null, userName, setUserFromAuth, logout, canVoteAndComment, canEdit, isAdmin, loading, togglePerformedProgram }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
