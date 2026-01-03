'use client';
import { useState, useEffect } from 'react';

const LocalDbIndicator = () => {
  const [dbId, setDbId] = useState<string | null>(null);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      setIsLocal(true);
      fetch('/api/db-id')
        .then(res => res.json())
        .then(data => setDbId(data.dbId))
        .catch(() => setDbId('error'));
    }
  }, []);

  if (!isLocal || !dbId) return null;

  return (
    <div className="monospace text-xs text-gray-400 fixed bottom-2 left-2 z-50 print:hidden">
      db: {dbId}
    </div>
  );
};

export default LocalDbIndicator;
