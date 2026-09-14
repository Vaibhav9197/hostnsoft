'use client';

import { useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { formatDate } from '../../lib/format';

interface ContactMessage {
  id: number;
  email: string;
  query: string;
  created_at: string;
}

export default function ContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/contact/list');
        if (!res.ok) {
          setError('Failed to fetch messages');
          return;
        }
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        setError('Network error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Refresh every 10s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Contact Queries</h1>
          <p className="text-muted-foreground mb-8">Messages from users through the contact form</p>

          {error && (
            <div className="mb-8 p-4 bg-[var(--danger-soft)] border border-destructive/30 rounded-lg">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <p className="text-muted-foreground">No contact messages yet</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-elevated border-b">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold">Email</th>
                      <th className="px-6 py-4 text-left font-semibold">Message</th>
                      <th className="px-6 py-4 text-left font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <tr key={msg.id} className="border-b hover:bg-elevated">
                        <td className="px-6 py-4">
                          <a
                            href={`mailto:${msg.email}`}
                            className="text-primary hover:underline"
                          >
                            {msg.email}
                          </a>
                        </td>
                        <td className="px-6 py-4 max-w-2xl">
                          <p className="text-foreground break-words whitespace-pre-wrap">
                            {msg.query}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm whitespace-nowrap">
                          {formatDate(msg.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-background px-6 py-4 text-sm text-muted-foreground">
                Total: {messages.length} message{messages.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
