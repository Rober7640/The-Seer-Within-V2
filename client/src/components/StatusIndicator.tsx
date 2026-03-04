import React, { useState, useEffect } from 'react';

type Status = 'busy-slow' | 'busy-fast' | 'connecting' | 'online';

export function StatusIndicator() {
  const [status, setStatus] = useState<Status>('busy-slow');
  const [text, setText] = useState('Busy');

  useEffect(() => {
    // Phase 2: Fast pulse at 2s
    const t1 = setTimeout(() => setStatus('busy-fast'), 2000);
    
    // Phase 3: Connecting at 2.5s
    const t2 = setTimeout(() => {
      setStatus('connecting');
      setText('Connecting...');
    }, 2500);
    
    // Phase 4: Online at 3s
    const t3 = setTimeout(() => {
      setStatus('online');
      setText('Online');
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const getStatusClass = (s: Status) => {
    switch (s) {
      case 'busy-slow': return 'animate-pulse-slow bg-status-busy';
      case 'busy-fast': return 'animate-pulse-fast bg-status-busy';
      case 'connecting': return 'animate-flicker'; // Animation handles bg color
      case 'online': return 'animate-glow bg-status-online';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 font-medium">
      <span className="text-gray-500">Evelyn Cross is</span>
      <span className={`w-2.5 h-2.5 rounded-full ${getStatusClass(status)}`} />
      <span className={status === 'online' ? 'text-green-600 font-semibold' : 'text-gray-500'}>
        {text}
      </span>
    </div>
  );
}
