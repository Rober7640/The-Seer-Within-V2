import { useState, useRef, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { authFetch, useAuth } from "@/hooks/useAuth";
import { CreditCard } from "lucide-react";
import { trackInitiateCheckout } from "@/lib/facebook";

interface StripeCardFormProps {
  packageType: string;
  personaId?: string | null;
  amount: number; // price in cents
  priceLabel: string;
  onSuccess: (newBalance: number) => void;
  onClick?: () => void;
  onCancel?: () => void;
}

function StripeCardFormInner({
  packageType,
  personaId,
  amount,
  priceLabel,
  onSuccess,
  onCancel,
}: {
  packageType: string;
  personaId?: string | null;
  amount: number;
  priceLabel: string;
  onSuccess: (newBalance: number) => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const icFiredRef = useRef(false);

  // ── iOS blank-card diagnostics + resilience ────────────────────────────────
  // On iPhone (WebKit) the Stripe card <iframe> can mount at zero height and stay
  // blank. `ready` lets us show a loading placeholder (never a pure-blank box) and
  // surface a load error as text. `?paydebug=1` shows a live timeline + the actual
  // iframe height so we can see WHY it's blank without a Mac/Web-Inspector.
  const [ready, setReady] = useState(false);
  const [dbg, setDbg] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  // Auto-enable on the dev deployment (hostname contains "development") so the
  // panel always shows there without a query param; ?paydebug=1 forces it anywhere.
  const showDebug =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("paydebug") === "1" ||
      /development/.test(window.location.hostname));
  const log = (m: string) => {
    // eslint-disable-next-line no-console
    console.log("[paydebug]", m);
    if (showDebug) setDbg((d) => [...d.slice(-18), `${new Date().toISOString().slice(11, 19)} ${m}`]);
  };

  useEffect(() => {
    const pk = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").slice(0, 8);
    log(`ua=${navigator.userAgent}`);
    log(`pk=${pk || "(EMPTY!)"} stripe=${!!stripe} elements=${!!elements}`);
    const onErr = (e: ErrorEvent) => log(`window.onerror: ${e.message}`);
    const onRej = (e: PromiseRejectionEvent) => log(`unhandledrejection: ${String(e.reason)}`);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    // Sample the Stripe iframe height over time to confirm it stays rendered
    // (the __stripeJSBridgeFrame display:none bug collapsed it 341px→0px on iOS).
    const timers = [200, 700, 1500, 3000, 5000].map((ms) =>
      setTimeout(() => {
        const ifrs = Array.from(formRef.current?.querySelectorAll("iframe") ?? []);
        const info = ifrs
          .map((f) => `${(f as HTMLIFrameElement).offsetHeight}px${/stripe/.test((f as HTMLIFrameElement).src) ? "*" : ""}`)
          .join(",");
        log(`t+${ms}ms iframes=${ifrs.length}[${info}] ready=${ready}`);
      }, ms),
    );
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, elements]);

  // Fire InitiateCheckout on first keystroke in the card field (engagement-
  // moment IC). Mount-scoped: once per StripeCardForm instance. Switching
  // tier remounts the form, which re-arms this fire.
  const handlePaymentElementChange = (event: { empty: boolean }) => {
    if (icFiredRef.current) return;
    if (event.empty) return;
    icFiredRef.current = true;
    if (user?.signupFunnel === 'aiden' || user?.signupFunnel === 'evelyn') {
      trackInitiateCheckout(
        typeof amount === "number" && amount > 0 ? amount / 100 : undefined,
        "USD",
        "V2 Credits — Stripe",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Validate card details
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message ?? "Please check your card details.");
        setIsProcessing(false);
        return;
      }

      // Step 2: Create Payment Intent on server (only NOW, not on mount)
      const intentRes = await authFetch("/api/credits/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType,
          ...(personaId ? { personaId } : {}),
        }),
      });

      if (!intentRes.ok) {
        const data = await intentRes.json().catch(() => ({}));
        setError(data.error || "Failed to initialize payment.");
        setIsProcessing(false);
        return;
      }

      const intentData = await intentRes.json();

      // Dev mode: payment auto-completed
      if (intentData.devMode) {
        onSuccess(intentData.newBalance);
        return;
      }

      // Step 3: Confirm payment with the clientSecret from server
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: intentData.clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message ?? "Payment failed. Please try again.");
        onCancel?.();
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Step 4: Confirm on our backend
        const res = await authFetch("/api/credits/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to confirm payment. Please contact support.");
          setIsProcessing(false);
          return;
        }

        const data = await res.json();
        onSuccess(data.newBalance);
      } else {
        setError("Payment was not completed. Please try again.");
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error("Stripe payment error:", err);
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <div className="relative bg-white rounded-lg p-3 mb-3 min-h-[180px] [&_iframe]:!min-h-[40px]">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs pointer-events-none">
            <span className="w-4 h-4 mr-2 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            Loading secure card form…
          </div>
        )}
        <PaymentElement
          options={{ layout: "tabs" }}
          onChange={handlePaymentElementChange}
          onLoaderStart={() => log("PaymentElement loaderstart")}
          onReady={() => {
            setReady(true);
            const ifr = formRef.current?.querySelector("iframe");
            log(`PaymentElement ready iframeH=${ifr ? (ifr as HTMLIFrameElement).offsetHeight : "?"}`);
          }}
          onLoadError={(e: any) => {
            const msg = e?.error?.message || e?.error?.type || "Card form failed to load";
            log(`PaymentElement loaderror: ${msg}`);
            setError(msg);
          }}
        />
      </div>
      {showDebug && (
        <pre className="mb-2 max-h-40 overflow-auto rounded bg-black/80 p-2 text-[10px] leading-tight text-green-300 whitespace-pre-wrap break-all">
          {dbg.join("\n") || "(no debug output yet)"}
        </pre>
      )}
      {error && (
        <p className="text-red-500 text-xs mb-2 text-center">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition-colors disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Pay {priceLabel}
          </>
        )}
      </button>
    </form>
  );
}

export default function StripeCardForm({
  packageType,
  personaId,
  amount,
  priceLabel,
  onSuccess,
  onClick,
  onCancel,
}: StripeCardFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount,
        currency: "usd",
        appearance: {
          theme: "stripe",
          variables: {
            borderRadius: "8px",
          },
        },
      }}
    >
      <StripeCardFormInner
        packageType={packageType}
        personaId={personaId}
        amount={amount}
        priceLabel={priceLabel}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
