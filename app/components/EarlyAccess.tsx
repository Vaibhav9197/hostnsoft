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

type Ctx = { open: () => void };
const EarlyAccessContext = createContext<Ctx | null>(null);

export function useEarlyAccess() {
  const ctx = useContext(EarlyAccessContext);
  if (!ctx) throw new Error("useEarlyAccess must be used within EarlyAccessProvider");
  return ctx;
}

export function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastFocus = useRef<HTMLElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const open = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement;
    setSubmitted(false);
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    /* Placeholder: wire up to your list provider here.
       The form values are available via new FormData(form). */
    setSubmitted(true);
  };

  return (
    <EarlyAccessContext.Provider value={{ open }}>
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
              <p className="sub">Be among the first businesses to put AI&#8209;made apps to work.</p>
              <form onSubmit={onSubmit} noValidate>
                <div className="field">
                  <label htmlFor="f-name">Name</label>
                  <input id="f-name" name="name" type="text" required autoComplete="name" ref={nameRef} />
                </div>
                <div className="field">
                  <label htmlFor="f-email">Work email</label>
                  <input id="f-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="field">
                  <label htmlFor="f-biz">Business name</label>
                  <input id="f-biz" name="business" type="text" required autoComplete="organization" />
                </div>
                <div className="field">
                  <label htmlFor="f-app">
                    What kind of app do you want to put to work? <span className="opt">(optional)</span>
                  </label>
                  <textarea id="f-app" name="app" rows={3} placeholder="An order tracker, a booking tool, a customer portal…" />
                </div>
                <button className="btn" type="submit">Get early access</button>
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
              <button className="btn" onClick={close} style={{ marginTop: "1.5rem" }}>Done</button>
            </div>
          )}
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
    <button className={className} onClick={open}>
      {children}
    </button>
  );
}
