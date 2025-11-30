'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type UserContextType = {
  userName: string;
  setUserName: (name: string) => void;
  canEdit: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userName, setUserNameState] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('userName');
    if (saved) {
      setUserNameState(saved);
    }
  }, []);

  const setUserName = (name: string) => {
    setUserNameState(name);
    localStorage.setItem('userName', name);
  };

  const canEdit = userName.length >= 3;

  return (
    <UserContext.Provider value={{ userName, setUserName, canEdit }}>
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



