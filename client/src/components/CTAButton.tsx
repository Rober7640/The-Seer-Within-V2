import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';

export function CTAButton({ label = "Yes Evelyn, Please Begin My FREE Reading!" }: { label?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Enable after status goes Online (3s)
    const timer = setTimeout(() => setEnabled(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!enabled) {
    return (
      <button 
        disabled
        className="w-full py-4 px-6 rounded-lg bg-gray-100 text-gray-400 font-semibold cursor-not-allowed border border-gray-200"
        data-testid="button-cta-disabled"
      >
        {label}
      </button>
    );
  }

  return (
    <Link href="/chat">
      <button 
        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 animate-cta-appear hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        data-testid="button-cta-enabled"
      >
        {label}
      </button>
    </Link>
  );
}
