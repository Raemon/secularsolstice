'use client';

import Tooltip from '@/app/components/Tooltip';
import { useUser } from '../../contexts/UserContext';

const UsernameInput = () => {
  const { userName, setUserName, user } = useUser();
  console.log(user);
  return (
    <Tooltip content={"Edit your username"} placement="bottom">  
      <div className="flex items-center border border-gray-700 rounded-md pl-2 sm:py-1 mb-2 sm:mb-0">
        <span className="mr-2 saturate-0" aria-label="user" role="img">👤</span>
        <input
            id="username-input"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="px- py-1 bg-black w-[75px] sm:w-auto text-sm border-none radius-sm focus:outline-none"
          />
      </div>
    </Tooltip>
  );
};

export default UsernameInput;
