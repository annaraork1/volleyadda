"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            }
          ) => void;
        };
      };
    };
  }
}

type Props = {
  next?: string;
  text?: "signin_with" | "signup_with" | "continue_with";
  onError?: (message: string) => void;
};

export function GoogleSignIn({ next = "/", text = "continue_with", onError }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const hostRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId || !hostRef.current) return;
    let cancelled = false;

    async function onCredential(response: { credential: string }) {
      setBusy(true);
      onError?.("");
      try {
        const r = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken: response.credential }),
        }).then((x) => x.json());
        if (!r.ok) {
          onError?.(r.error || "Google sign-in failed");
          return;
        }
        window.location.assign(next);
      } catch {
        onError?.("No connection");
      } finally {
        setBusy(false);
      }
    }

    function render() {
      if (cancelled || !hostRef.current || !window.google?.accounts?.id) return;
      hostRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId!,
        callback: onCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      const width = Math.min(360, Math.max(240, hostRef.current.clientWidth || 320));
      window.google.accounts.id.renderButton(hostRef.current, {
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        width,
        logo_alignment: "left",
      });
      setReady(true);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gsi="1"]');
    if (existing) {
      if (window.google?.accounts?.id) render();
      else existing.addEventListener("load", render, { once: true });
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "1";
    script.addEventListener("load", render, { once: true });
    script.addEventListener(
      "error",
      () => onError?.("Could not load Google sign-in"),
      { once: true }
    );
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [clientId, next, onError, text]);

  if (!clientId) return null;

  return (
    <div className="google-signin" aria-busy={busy || !ready}>
      <div className="auth-divider" role="separator">
        <span>or</span>
      </div>
      <div ref={hostRef} className="google-signin-host" />
      {busy && <p className="muted" style={{ margin: 0, textAlign: "center" }}>Signing in with Google…</p>}
    </div>
  );
}
