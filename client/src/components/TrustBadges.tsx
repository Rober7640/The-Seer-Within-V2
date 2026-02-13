import React from 'react';
import { Lock, Shield } from 'lucide-react';

export function TrustBadges() {
  return (
    <div className="flex justify-center gap-6 mt-6 text-xs text-gray-400 uppercase tracking-wide">
      <div className="flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-gray-300" />
        <span>100% Private & Confidential</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-gray-300" />
        <span>Trusted By 1,111+ Seekers</span>
      </div>
    </div>
  );
}
