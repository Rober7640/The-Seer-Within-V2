import { useEffect, useRef, useState } from 'react';
import { useSearch, useLocation } from 'wouter';
import { CosmicBackground } from '../components/CosmicBackground';
import { BackgroundMusic } from '../components/BackgroundMusic';
import { Upsell2CTA, Upsell2DownsellCTA, ShippingForm, QuickReplies } from '../components/upsell';
import { useUpsell2Chat, Message } from '../hooks/useUpsell2Chat';
import { trackUpsellPurchase } from '../lib/facebook';
import { trackGAdsPurchase } from '../lib/gtm';
import { funnelPath } from '../lib/funnel';
import { Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Bucket } from '@shared/types';

interface UserData {
  firstName: string;
  email: string;
  bucket: Bucket;
  concern: string;
  personName: string | null;
  upsellPurchased: boolean;
  hasShipping: boolean;
  shipping: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  } | null;
}

export default function Upsell2Page() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const sid = params.get('session_id');
    const demo = params.get('demo');
    const declined = params.get('declined');
    const fallbackSessionId = params.get('fallback_session_id');

    if (demo === 'true' || sid === 'demo') {
      setSessionId('demo_session');
      setUserData({
        firstName: 'Sarah',
        email: 'demo@example.com',
        bucket: 'love',
        concern: 'finding my soulmate',
        personName: null,
        upsellPurchased: true,
        hasShipping: true,
        shipping: {
          name: 'Sarah Demo',
          line1: '123 Demo St',
          city: 'Demo City',
          state: 'CA',
          postal: '90210',
          country: 'US',
        },
      });
      setIsLoading(false);
      return;
    }

    if (!sid) {
      setError('Missing session');
      setIsLoading(false);
      return;
    }

    setSessionId(sid);

    async function fetchUserData() {
      try {
        if (fallbackSessionId) {
          const confirmFallback = async (attempt = 1): Promise<boolean> => {
            try {
              const res = await fetch('/api/upsell/confirm-fallback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  originalSessionId: sid,
                  fallbackSessionId: fallbackSessionId,
                }),
              });
              if (res.ok) {
                console.log('Upsell 1 fallback purchase confirmed');
                return true;
              }
              console.warn(`Confirm fallback attempt ${attempt} failed:`, res.status);
              return false;
            } catch (err) {
              console.error(`Confirm fallback attempt ${attempt} error:`, err);
              return false;
            }
          };

          let confirmed = await confirmFallback(1);
          if (!confirmed) {
            await new Promise(r => setTimeout(r, 1000));
            confirmed = await confirmFallback(2);
          }
          if (!confirmed) {
            await new Promise(r => setTimeout(r, 2000));
            confirmed = await confirmFallback(3);
          }
        }

        let response = await fetch(`/api/upsell2/user-data?session_id=${sid}`);

        // Retry once after 2s if first attempt fails (handles brief server delays)
        if (!response.ok) {
          await new Promise(r => setTimeout(r, 2000));
          response = await fetch(`/api/upsell2/user-data?session_id=${sid}`);
        }

        if (!response.ok) {
          throw new Error('Order not found');
        }

        const data = await response.json();
        setUserData(data);

        // Track Upsell 1 event on /welcome2 load (fires once per session).
        // Use the actual charged amount (varies by price-test variant); fall
        // back to $47 for pre-test conversations where it isn't recorded.
        if (data.upsellPurchased) {
          const upsell1Dollars = (data.upsellAmountCents ?? 4700) / 100;
          trackUpsellPurchase(upsell1Dollars, "USD", data.email, "Protection Ritual + Volcanic Stone", sid ?? undefined, 'u1', { skipServerRelay: true });
          trackGAdsPurchase("upsell1", upsell1Dollars, sid);

          // Trackdesk affiliate conversion tracking - upsell 1
          if (typeof window.trackdesk === "function") {
            window.trackdesk("the-seer-within", "conversion", {
              conversionType: "sale",
              amount: { value: String(upsell1Dollars) },
              externalId: `${sid}_upsell1`,
              customerId: data.email,
              currencyCode: "USD",
            });
          }
        }

        if (declined === 'true') {
          setError('declined');
        }
      } catch (err) {
        setError('Could not load your session');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [searchString]);

  const {
    messages,
    isTyping,
    showQuickReplies,
    quickReplies,
    inputEnabled,
    showCTA,
    showDownsellCTA,
    showShippingForm,
    isProcessing,
    isComplete,
    upsell2Bought,
    handleUserInput,
    handleQuickReply,
    handleAccept,
    handleDecline,
    handleDownsellAccept,
    handleDownsellDecline,
    handleShippingSubmit,
  } = useUpsell2Chat({
    userData,
    sessionId,
    enabled: !!userData && !error,
    braceletImage: '/manifestation_bracelet.png',
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isComplete && sessionId) {
      // Pass upsell flags so the success page can show products immediately
      // even before the DB is updated (belt-and-suspenders approach)
      const upsell1Flag = userData?.upsellPurchased ? '&upsell=true' : '';
      const upsell2Flag = upsell2Bought ? '&upsell2=true' : '';
      navigate(`${funnelPath("/success")}?session_id=${sessionId}${upsell1Flag}${upsell2Flag}`);
    }
  }, [isComplete, sessionId, navigate, userData?.upsellPurchased, upsell2Bought]);

  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && inputEnabled) {
      handleUserInput(inputValue.trim());
      setInputValue('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="text-white/60 animate-pulse flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your session...
        </div>
      </div>
    );
  }

  if (error && error !== 'declined') {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={() => navigate(funnelPath('/'))}
            className="text-purple-400 hover:text-purple-300 transition-colors"
            data-testid="link-return-home"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col" data-testid="page-upsell2">
      <CosmicBackground />
      <BackgroundMusic />

      <div className="relative z-10 p-4 text-center border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-sm text-white/60">
          <Volume2 className="w-4 h-4" data-testid="icon-volume-upsell2" />
          <span>Sound on for best experience</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
        data-testid="container-chat-upsell2"
      >
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-center text-xs text-gray-400 my-4">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', hour: 'numeric', minute: 'numeric' })}
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`message-${msg.role}-${msg.id}`}
            >
              {msg.role === 'image' ? (
                <div className="max-w-[70%] rounded-2xl overflow-hidden shadow-lg border border-purple-200/30">
                  <img 
                    src={msg.content} 
                    alt="Manifestation bracelet" 
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm md:text-base leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start w-full animate-fade-in" data-testid="indicator-typing-upsell2">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showQuickReplies || (inputEnabled && !showCTA && !showDownsellCTA && !showShippingForm) || showCTA || showDownsellCTA || showShippingForm) && (
      <div className="relative z-10 shrink-0 bg-black/30 backdrop-blur-sm border-t border-white/10">
        {showQuickReplies && (
          <QuickReplies
            replies={quickReplies}
            onSelect={handleQuickReply}
            disabled={isTyping}
          />
        )}

        {inputEnabled && !showCTA && !showDownsellCTA && !showShippingForm && (
          <form onSubmit={handleSubmitInput} className="p-4 pt-0" data-testid="form-chat-input-upsell2">
            <div className="flex gap-2 max-w-lg mx-auto">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Or type your response..."
                disabled={isTyping}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                data-testid="input-chat-upsell2"
              />
              <Button 
                type="submit" 
                disabled={isTyping || !inputValue.trim()}
                size="sm"
                data-testid="button-send-upsell2"
              >
                Send
              </Button>
            </div>
          </form>
        )}

        {showCTA && (
          <div className="max-w-lg mx-auto">
            <Upsell2CTA
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {showDownsellCTA && (
          <div className="max-w-lg mx-auto">
            <Upsell2DownsellCTA
              onAccept={handleDownsellAccept}
              onDecline={handleDownsellDecline}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {showShippingForm && (
          <div className="max-w-lg mx-auto p-4">
            <ShippingForm
              defaultName={userData?.firstName || ''}
              productLabel="manifestation bracelet"
              onSubmit={handleShippingSubmit}
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
