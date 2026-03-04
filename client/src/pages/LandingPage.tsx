import { CosmicBackground } from '../components/CosmicBackground';
import { StatusIndicator } from '../components/StatusIndicator';
import { CTAButton } from '../components/CTAButton';
import { TrustBadges } from '../components/TrustBadges';
import { Link } from 'wouter';
import { Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />
      
      {/* Logo Area */}
      <div className="mb-8 flex items-center gap-3 animate-fade-in text-center">
        <Sparkles className="w-10 h-10 text-purple-300 filter drop-shadow-lg" />
        <h1 className="font-serif text-3xl md:text-4xl text-secondary drop-shadow-md">
          The Seer Within
        </h1>
      </div>

      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-auto relative z-10 border border-white/20">
        {/* Avatar */}
        <div className="flex justify-center mb-6 -mt-16">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-purple-100">
            <img 
              src="/evelyn-avatar.png" 
              alt="Evelyn Cross"
              className="w-full h-full object-cover"
              data-testid="img-avatar-landing"
            />
          </div>
        </div>
        
        {/* Status */}
        <div className="mb-6 bg-gray-50 rounded-full py-2 px-4 inline-block mx-auto w-full text-center border border-gray-100 shadow-inner">
          <StatusIndicator />
        </div>
        
        {/* Divider */}
        <div className="w-16 h-0.5 bg-gray-200 mx-auto my-6" />
        
        {/* Headline */}
        <h2 className="font-serif text-2xl md:text-3xl text-gray-900 text-center mb-4 leading-tight">
          Everything You Desire Is Within Reach
        </h2>
        
        {/* Subheadline */}
        <p className="text-gray-600 text-center text-sm md:text-base mb-8 leading-relaxed">
          Evelyn has sensed the blessings you so richly deserve. <br/>
          <strong className="text-gray-900 font-semibold"> Don't miss your chance for your life to be changed forever.</strong>
        </p>
        
        {/* CTA Button */}
        <CTAButton />
        
        {/* Scarcity text */}
        <p className="text-center text-xs text-gray-400 mt-4 italic">
          * Each reading drains Evelyn's energy. If you're reading this, you have been chosen...
        </p>
        
        {/* Trust badges */}
        <TrustBadges />
      </div>

      <footer className="mt-8 text-white/40 text-xs text-center space-y-2">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/privacy">
            <span className="hover:text-white/70 cursor-pointer transition-colors" data-testid="link-privacy">Privacy Policy</span>
          </Link>
          <span>·</span>
          <Link href="/terms">
            <span className="hover:text-white/70 cursor-pointer transition-colors" data-testid="link-terms">Terms of Service</span>
          </Link>
          <span>·</span>
          <Link href="/refund">
            <span className="hover:text-white/70 cursor-pointer transition-colors" data-testid="link-refund">Refund Policy</span>
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.</p>
      </footer>
    </div>
  );
}
