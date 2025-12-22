'use client';

import { useState, useEffect, type KeyboardEvent } from 'react';
import { User } from '@/app/user/types';

type SignInModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  currentUserId: string | null;
  initialMode?: 'login' | 'register';
};

const SignInModal = ({ visible, onClose, onSuccess, currentUserId, initialMode = 'login' }: SignInModalProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  useEffect(() => { if (visible) setMode(initialMode); }, [visible, initialMode]);

  if (!visible) return null;

  const handleSubmit = async (submitMode: 'login' | 'register') => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, currentUserId, mode: submitMode }),
      });
      if (response.ok) {
        const user = await response.json();
        onSuccess(user);
        setUsername('');
        setPassword('');
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Sign in failed');
      }
    } catch (err) {
      setError('Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit(mode);
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 mb-4">
          <button type="button" onClick={() => setMode('login')} className={`text-lg font-semibold ${mode === 'login' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>Sign In</button>
          <button type="button" onClick={() => setMode('register')} className={`text-lg font-semibold ${mode === 'register' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>Create Account</button>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Username"
            className="text-sm px-3 py-2 bg-gray-800 text-white"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Password"
            className="text-sm px-3 py-2 bg-gray-800 text-white"
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button type="button" onClick={() => handleSubmit(mode)} disabled={isSubmitting} className="text-sm px-3 py-1 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
            {isSubmitting ? (mode === 'login' ? 'Signing in...' : 'Creating...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </div>
        <p className="mt-4 text-gray-400 text-xs border-t border-gray-700 pt-4">Lost your password? Contact <a href="mailto:raemon777@gmail.com" className="text-blue-400 hover:text-blue-300">raemon777@gmail.com</a> and he'll reset it.</p>
      </div>
    </div>
  );
};

export default SignInModal;
