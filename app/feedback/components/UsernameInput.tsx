'use client';

import Tooltip from '@/app/components/Tooltip';
import { useUser } from '../../contexts/UserContext';

const UsernameInput = () => {
  const { userName, setUserName, user } = useUser();
  
  return (
    <Tooltip content={user?.id || 'Loading...'} placement="bottom">  
      <input
        id="username-input"
        type="text"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="Enter your name"
        className="px-2 py-1 bg-black text-sm w-[200px] border-none radius-sm"
      />
    </Tooltip>
  );
};

export default UsernameInput;
