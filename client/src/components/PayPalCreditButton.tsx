import { PayPalButtons } from "@paypal/react-paypal-js";
import { authFetch } from "@/hooks/useAuth";
import { useState } from "react";
import { trackInitiateCheckout } from "@/lib/facebook";

interface Props {
  packageType: string;
  personaId?: string | null;
  // Price in cents — used only for FB InitiateCheckout reporting. Optional
  // so legacy call sites that don't pass it still compile; tracking falls
  // back to a value-less event in that case.
  amount?: number;
  onSuccess: (newBalance: number) => void;
  onClick?: () => void;
  onCancel?: () => void;
}

export default function PayPalCreditButton({ packageType, personaId, amount, onSuccess, onClick, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="bg-white rounded-lg px-3 pt-2 pb-1">
      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal", tagline: false }}
        createOrder={async () => {
          setError(null);
          onClick?.();
          // FB InitiateCheckout — fired before the order-creation API call
          // so a slow/failed createOrder still records the user's intent.
          if (typeof amount === "number" && amount > 0) {
            trackInitiateCheckout(amount / 100, "USD", "V2 Credits — PayPal");
          } else {
            trackInitiateCheckout(undefined, "USD", "V2 Credits — PayPal");
          }
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
        onCancel={() => {
          onCancel?.();
        }}
        onError={() => {
          onCancel?.();
          setError("PayPal encountered an error. Please try again.");
        }}
      />
      </div>
      {error && <p className="text-red-400 text-xs mt-1 text-center">{error}</p>}
    </div>
  );
}
