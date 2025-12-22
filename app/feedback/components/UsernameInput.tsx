'use client';

import { useState } from 'react';
import Tooltip from '@/app/components/Tooltip';
import { useUser } from '../../contexts/UserContext';
import SignInModal from './SignInModal';

const UsernameInput = ({lightMode = false}: {lightMode?: boolean}) => {
  const { userName, user, setUserFromAuth, logout } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');
  const isGuest = !user || !user?.ever_set_username;
  const outlineColor = lightMode ? 'outline-gray-300' : 'outline-gray-700';
  const textColor = lightMode ? (isGuest ? 'text-gray-500' : 'text-gray-700') : 'text-gray-400';
  const openModal = (mode: 'login' | 'register') => { setModalMode(mode); setShowModal(true); };
  return (
    <div className="flex items-center gap-2">
      {userName && <div className={`flex items-center gap-2 px-2 outline outline-1 ${outlineColor} rounded-md p-1`}>
        <span className={`text-xs ${textColor}`}>{userName}</span>
      </div>}
      {isGuest ? (
        <>
          <button onClick={() => openModal('login')} className="text-xs text-primary hover:bg-primary/25 whitespace-nowrap border border-primary rounded-md px-2 py-1">Sign In</button>
          <button onClick={() => openModal('register')} className="text-xs text-white hover:bg-white/25 whitespace-nowrap border border-white rounded-md px-2 py-1">Create Account</button>
        </>
      ) : (
        <Tooltip content="Logout" placement="bottom"><button onClick={logout} className="text-xs text-gray-200 hover:text-gray-300" title="Logout">⏻</button></Tooltip>
      )}
      <SignInModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={setUserFromAuth}
        currentUserId={user?.id || null}
        initialMode={modalMode}
      />
    </div>
  );
};

export default UsernameInput;
