import { useState, useRef } from "react";
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
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-lg p-3 mb-3">
        <PaymentElement
          options={{ layout: "tabs" }}
          onChange={handlePaymentElementChange}
        />
      </div>
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
