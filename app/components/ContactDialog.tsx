'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDialog({ open, onOpenChange }: ContactDialogProps) {
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
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
        body: JSON.stringify({ email, query }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send message');
        setStatus('error');
      } else {
        setStatus('success');
        setEmail('');
        setQuery('');
        setTimeout(() => {
          onOpenChange(false);
          setStatus('idle');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Get in touch</h2>

        {status === 'success' && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Message sent!</p>
              <p className="text-sm text-green-700">We'll get back to you soon.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="query" className="block text-sm font-medium mb-1">
              Message
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tell us what you need..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/85 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
