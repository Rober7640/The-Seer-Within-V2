// iOS/WebKit renders a cross-origin iframe blank when ANY ancestor has a CSS
// transform. The centered Radix DialogContent uses translate(-50%,-50%), which
// collapses Stripe's card <iframe> (PaymentElement) to nothing on iPhone — in
// Safari AND Chrome-for-iOS (both WebKit). Desktop is unaffected, and PayPal
// survives because its button iframe has a fixed height.
//
// Fix: on phones only (max-sm), dock the payment modals to the bottom of the
// viewport with NO transform, so the Stripe fields render. Desktop keeps the
// existing centered look. Apply to every DialogContent that hosts <StripeCardForm/>
// (directly or via PaymentSheetView). We override BOTH `transform` and the v4
// `translate` utilities to be safe across Tailwind versions.
export const PAYMENT_DIALOG_MOBILE_SHEET =
  "max-sm:!left-0 max-sm:!right-0 max-sm:!top-auto max-sm:!bottom-0 " +
  "max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!transform-none " +
  "max-sm:!w-full max-sm:!max-w-full";
