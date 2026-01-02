'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const DevLoginPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userId = searchParams.get('userId');
    const redirect = searchParams.get('redirect') || '/';

    if (!userId) {
      setStatus('error');
      setMessage('Missing userId query parameter. Usage: /dev-login?userId=xxx&redirect=/users/all');
      return;
    }

    // Set localStorage
    localStorage.setItem('userId', userId);
    setStatus('success');
    setMessage(`Logged in as user ${userId}. Redirecting...`);

    // Redirect after a brief delay
    setTimeout(() => {
      router.push(redirect);
    }, 500);
  }, [searchParams, router]);

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dev Login</h1>
      {status === 'loading' && <p className="text-gray-400">Processing...</p>}
      {status === 'success' && <p className="text-green-400">{message}</p>}
      {status === 'error' && <p className="text-red-400">{message}</p>}
    </div>
  );
};

export default DevLoginPage;
