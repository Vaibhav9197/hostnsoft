'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Mail, ExternalLink } from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="w-64 bg-gray-900 text-white p-6 min-h-screen flex flex-col">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Dashboard</p>
        </div>

        <div className="space-y-2">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive('/admin')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>AB Test Metrics</span>
          </Link>

          <Link
            href="/admin/contact"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive('/admin/contact')
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span>Contact Queries</span>
          </Link>
        </div>
      </div>

      <div className="mt-auto">
        <a
          href="/app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition"
        >
          <ExternalLink className="w-5 h-5" />
          <span>Go to App</span>
        </a>
      </div>
    </nav>
  );
}
