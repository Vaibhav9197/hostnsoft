'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, Mail, MessageSquare, ArrowLeft } from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  /* Sticky, viewport-tall and scrollable on its own: the admin pages run
     longer than the screen, and without this the nav scrolled off the top
     and the sidebar's ground ran out behind it. */
  return (
    <nav className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r border-border bg-card text-foreground p-6 flex flex-col">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-faint text-sm mt-1">Dashboard</p>
        </div>

        <div className="space-y-2">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive('/admin')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-elevated hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>AB Test Metrics</span>
          </Link>

          <Link
            href="/admin/apps"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive('/admin/apps')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-elevated hover:text-foreground'
            }`}
          >
            <Boxes className="w-5 h-5" />
            <span>All Apps</span>
          </Link>

          {/* Contact Queries — parked for now. The page and /api/contact/list
              still exist; this only hides the way in. Restore by uncommenting.
          <Link
            href="/admin/contact"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive('/admin/contact')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-elevated hover:text-foreground'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span>Contact Queries</span>
          </Link>
          */}

          <Link
            href="/admin/customer-query"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive('/admin/customer-query')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-elevated hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Customer Queries</span>
          </Link>
        </div>
      </div>

      <div className="mt-auto">
        {/* Same window: this is a move back into the console, not a detour
            out to another site, so a new tab just leaves admin orphaned. */}
        <a
          href="/app"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-elevated transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Go to App</span>
        </a>
      </div>
    </nav>
  );
}
