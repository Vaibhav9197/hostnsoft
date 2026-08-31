"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type OpenOptions = {
  /** Pre-fill the "what kind of app" field (e.g. the prompt typed in the hero). */
  app?: string;
  /** Optional context line shown under the title (e.g. "Connecting a GitHub repo"). */
  context?: string;
};

type Ctx = { open: (opts?: OpenOptions) => void };
const EarlyAccessContext = createContext<Ctx | null>(null);

export function useEarlyAccess() {
  const ctx = useContext(EarlyAccessContext);
  if (!ctx) throw new Error("useEarlyAccess must be used within EarlyAccessProvider");
  return ctx;
}

export function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillApp, setPrefillApp] = useState("");
  const [context, setContext] = useState("");
  const lastFocus = useRef<HTMLElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const open = useCallback((opts?: OpenOptions) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setSubmitted(false);
    setSubmitting(false);
    setError(null);
    setPrefillApp(opts?.app?.trim() || "");
    setContext(opts?.context?.trim() || "");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    lastFocus.current?.focus();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) {
      const t = setTimeout(() => nameRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      business: String(data.get("business") || ""),
      app: String(data.get("app") || ""),
    };

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Something went wrong. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EarlyAccessContext.Provider value={{ open }}>
      {/* Scopes all of app/globals.css's marketing-site CSS (see the .site
          note there) to this subtree, so it can never reach the console. */}
      <div className="site">
      {children}

      <div
        className={`overlay${isOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <button className="close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {!submitted ? (
            <div>
              <h3 id="modalTitle">Get early access</h3>
              <p className="sub">
                {context || "Be among the first to deploy on hostnsoft."}
              </p>
              <form onSubmit={onSubmit} noValidate>
                <div className="field">
                  <label htmlFor="f-name">Name</label>
                  <input id="f-name" name="name" type="text" required autoComplete="name" ref={nameRef} disabled={submitting} />
                </div>
                <div className="field">
                  <label htmlFor="f-email">Work email</label>
                  <input id="f-email" name="email" type="email" required autoComplete="email" disabled={submitting} />
                </div>
                <div className="field">
                  <label htmlFor="f-biz">Business name</label>
                  <input id="f-biz" name="business" type="text" required autoComplete="organization" disabled={submitting} />
                </div>
                <div className="field">
                  <label htmlFor="f-app">
                    What are you looking to deploy? <span className="opt">(optional)</span>
                  </label>
                  <textarea
                    id="f-app"
                    name="app"
                    rows={3}
                    placeholder="A Node API, a Python web app, an internal tool…"
                    defaultValue={prefillApp}
                    key={prefillApp}
                    disabled={submitting}
                  />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Get early access"}
                </button>
              </form>
            </div>
          ) : (
            <div className="success">
              <span className="check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <h3>You&apos;re on the list.</h3>
              <p>We&apos;ll be in touch soon.</p>
              <button className="btn mt-6" onClick={close}>Done</button>
            </div>
          )}
        </div>
      </div>
      </div>
    </EarlyAccessContext.Provider>
  );
}

export function GetAccessButton({
  children = "Get early access",
  className = "btn",
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { open } = useEarlyAccess();
  return (
    <button className={className} onClick={() => open()}>
      {children}
    </button>
  );
}
