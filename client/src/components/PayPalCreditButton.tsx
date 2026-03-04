import { PayPalButtons } from "@paypal/react-paypal-js";
import { authFetch } from "@/hooks/useAuth";
import { useState } from "react";

interface Props {
  packageType: string;
  personaId?: string | null;
  onSuccess: (newBalance: number) => void;
  onPaymentStart?: () => void;
}

export default function PayPalCreditButton({ packageType, personaId, onSuccess, onPaymentStart }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="bg-white rounded-lg px-3 pt-2 pb-1">
      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal", tagline: false }}
        onClick={() => { onPaymentStart?.(); }}
        createOrder={async () => {
          setError(null);
          const res = await authFetch("/api/credits/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageType, ...(personaId ? { personaId } : {}) }),
          });
          if (!res.ok) throw new Error("Failed to create order");
          const data = await res.json();
          return data.orderId;
        }}
        onApprove={async (data) => {
          const res = await authFetch("/api/credits/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          if (!res.ok) {
            setError("Payment capture failed. Please try again.");
            return;
          }
          const result = await res.json();
          onSuccess(result.newBalance);
        }}
        onError={() => {
          setError("PayPal encountered an error. Please try again.");
        }}
      />
      </div>
      {error && <p className="text-red-400 text-xs mt-1 text-center">{error}</p>}
    </div>
  );
}
