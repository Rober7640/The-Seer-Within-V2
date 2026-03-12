import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { authFetch } from "@/hooks/useAuth";
import { CreditCard } from "lucide-react";

interface StripeCardFormProps {
  packageType: string;
  personaId?: string | null;
  priceLabel: string;
  onSuccess: (newBalance: number) => void;
  onClick?: () => void;
  onCancel?: () => void;
}

function StripeCardFormInner({
  priceLabel,
  onSuccess,
  onCancel,
}: {
  priceLabel: string;
  onSuccess: (newBalance: number) => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message ?? "Payment failed. Please try again.");
        onCancel?.();
        setIsProcessing(false);
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        // Confirm on our backend
        const res = await authFetch("/api/credits/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: result.paymentIntent.id }),
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
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-lg p-3 mb-3">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
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
  priceLabel,
  onSuccess,
  onClick,
  onCancel,
}: StripeCardFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function createIntent() {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch("/api/credits/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageType,
            ...(personaId ? { personaId } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setError(data.error || "Failed to initialize payment.");
          return;
        }

        const data = await res.json();

        if (data.devMode) {
          // Dev mode: payment auto-completed
          if (!cancelled) onSuccess(data.newBalance);
          return;
        }

        if (!cancelled) setClientSecret(data.clientSecret);
      } catch {
        if (!cancelled) setError("Failed to initialize payment. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    createIntent();
    return () => { cancelled = true; };
  }, [packageType, personaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-xs text-center py-4">{error}</p>;
  }

  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            borderRadius: "8px",
          },
        },
      }}
    >
      <StripeCardFormInner
        priceLabel={priceLabel}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
