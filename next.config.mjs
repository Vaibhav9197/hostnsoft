/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

// Note: OpenNext's initOpenNextCloudflareForDev() is intentionally NOT called here.
// It loads the workerd runtime into `next dev`, which this app doesn't need
// (the API uses only process.env + fetch, no Cloudflare bindings). The real
// Worker runtime is exercised via `npm run preview` / `npm run deploy` (Wrangler).
