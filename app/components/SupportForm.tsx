'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

// Same backend as ContactDialog (POST /api/contact -> hostnsoft-api's
// POST /public/customer-query) - this is the inline, page-embedded version
// for /support, so the form has a real URL of its own instead of living
// only behind the footer's "Contact" button.
const TYPES = [
  { value: 'feedback', label: 'Feedback' },
  { value: 'feature', label: 'Feature' },
  { value: 'other', label: 'Other' },
] as const;

type QueryType = (typeof TYPES)[number]['value'];

export function SupportForm() {
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<QueryType>('feedback');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !query) {
      setErrorMsg('Please fill in all fields');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, query, type }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send message');
        setStatus('error');
      } else {
        setStatus('success');
        setEmail('');
        setQuery('');
        setType('feedback');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex gap-3 rounded-lg border border-border bg-elevated p-4">
        <CheckCircle className="mt-0.5 size-5 shrink-0 text-foreground" />
        <div>
          <p className="font-semibold text-foreground">Message sent</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We read every one of these and reply by email — usually within a day or two.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === 'error' && (
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
      )}

      <div>
        <span id="support-type" className="mb-1.5 block text-sm font-semibold text-foreground">
          Type
        </span>
        <div
          role="radiogroup"
          aria-labelledby="support-type"
          className="grid grid-cols-3 gap-1 rounded-md bg-accent p-1"
        >
          {TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value)}
              disabled={loading}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                type === value
                  ? 'bg-elevated-2 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="support-email" className="mb-1.5 block text-sm font-semibold text-foreground">
          Email
        </label>
        <input
          id="support-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={loading}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div>
        <label htmlFor="support-message" className="mb-1.5 block text-sm font-semibold text-foreground">
          Message
        </label>
        <textarea
          id="support-message"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="What's going wrong, or what would you like us to build?"
          disabled={loading}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {loading && <Loader className="size-4 animate-spin" />}
        Send
      </button>
    </form>
  );
}
