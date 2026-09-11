import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // The docs used to live at /doc. The deploy prompt, llms.txt and older
      // shared links all point at the singular form, so keep it working.
      { source: "/doc", destination: "/docs", permanent: true },
    ];
  },
};

/* Loads the workerd runtime into `next dev` so getCloudflareContext() can hand
   out the D1 binding locally. This was deliberately left out while the app used
   no bindings at all — that stopped being true when the A/B store moved to D1,
   and without it every /api/events and /api/metrics request fails in dev.
   Running dev on the same binding as production is also what would have caught
   the better-sqlite3 problem before it shipped. */
initOpenNextCloudflareForDev();

export default nextConfig;
