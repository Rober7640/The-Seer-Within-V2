// Cloudflare Turnstile invisible CAPTCHA widget.
// Renders an invisible challenge and calls onToken with the verification token.
// The token is then sent to the server with the form submission.

import { useEffect, useRef, useCallback } from "react";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          size?: "invisible" | "normal" | "compact";
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export default function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => {
        onToken(token);
      },
      "error-callback": () => {
        // Fail open on client — server will also fail open if Cloudflare is down
        onToken("");
      },
      "expired-callback": () => {
        onToken("");
      },
      size: "invisible",
      theme: "dark",
    });
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    // If turnstile script is already loaded, render immediately
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Load the Turnstile script
    if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      window.onTurnstileLoad = renderWidget;

      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  if (!TURNSTILE_SITE_KEY) return null;

  return <div ref={containerRef} />;
}
