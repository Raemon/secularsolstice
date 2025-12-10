'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type User = {
  id: string;
  username: string | null;
  is_guest: boolean;
  created_at: string;
};

type UserContextType = {
  user: User | null;
  userName: string;
  setUserName: (name: string) => void;
  canEdit: boolean;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

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

        // Create a new guest user with existing username if available
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: existingUsername || undefined }),
        });

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
    if (!user) return;

    setUserNameState(name);
    localStorage.setItem('userName', name);
    
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
      }
    } catch (error) {
      console.error('Error updating username:', error);
    }
  };

  const canEdit = userName.length >= 3;

  return (
    <UserContext.Provider value={{ user, userName, setUserName, canEdit, loading }}>
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
