import React from 'react';

export function CosmicBackground() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-bg-deep to-bg-mid overflow-hidden -z-10">
      {/* Stars - small white dots with twinkle animation */}
      <div className="stars opacity-80" />
      <div className="stars opacity-50 scale-150 translate-x-10 translate-y-10" />
      
      {/* Subtle Aurora / Light Ray effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}
