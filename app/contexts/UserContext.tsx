'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type User = {
  id: string;
  username: string | null;
  created_at: string;
  performed_program_ids: string[];
};

type UserContextType = {
  user: User | null;
  userId: string | null;
  userName: string;
  setUserName: (name: string) => void;
  canEdit: boolean;
  loading: boolean;
  togglePerformedProgram: (programId: string) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const generateRandomName = (): string => {
  const adjectives = ['Happy', 'Cool', 'Bright', 'Swift', 'Bold', 'Calm', 'Kind', 'Wise', 'Brave', 'Gentle'];
  const nouns = ['Star', 'Wave', 'Cloud', 'River', 'Mountain', 'Forest', 'Ocean', 'Valley', 'Meadow', 'Creek'];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  return `${randomAdjective}${randomNoun}${randomNumber}`;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserNameState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Check for existing userId in localStorage
        let userId = localStorage.getItem('userId');
        
        if (userId) {
          // Try to fetch existing user
          const response = await fetch(`/api/users?userId=${userId}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setUserNameState(userData.username || '');
            setLoading(false);
            return;
          }
          // If user not found, clear invalid userId
          localStorage.removeItem('userId');
        }

        // Check if there's an existing username in localStorage (from old system)
        const existingUsername = localStorage.getItem('userName');

        // Create a new guest user with existing username if available, or generate a random name
        let usernameToUse = existingUsername || generateRandomName();
        let response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameToUse }),
        });

        // If username already exists, generate a new one and retry
        if (response.status === 409) {
          usernameToUse = generateRandomName();
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
          // Update localStorage with the username (whether existing or generated)
          if (newUser.username) {
            localStorage.setItem('userName', newUser.username);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  const setUserName = async (name: string) => {
    setUserNameState(name);
    localStorage.setItem('userName', name);
    
    // If no user exists, create one
    if (!user) {
      try {
        const trimmedName = name.trim();
        let response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmedName || undefined }),
        });

        // If username already exists and user provided a name, generate a new one
        if (response.status === 409 && trimmedName) {
          response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
        }

        if (response.ok) {
          const newUser = await response.json();
          setUser(newUser);
          localStorage.setItem('userId', newUser.id);
          // Update the displayed username to match what was actually created
          if (newUser.username) {
            setUserNameState(newUser.username);
            localStorage.setItem('userName', newUser.username);
          }
        }
      } catch (error) {
        console.error('Error creating user:', error);
      }
      return;
    }
    
    // Update user in database
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, username: name }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
      } else if (response.status === 409) {
        // Username already exists, revert the local state
        setUserNameState(user.username || '');
        console.error('Username already exists');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      // Revert the local state on error
      setUserNameState(user.username || '');
    }
  };

  const canEdit = userName.length >= 3;

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
    <UserContext.Provider value={{ user, userId: user?.id || null, userName, setUserName, canEdit, loading, togglePerformedProgram }}>
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
