/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

// Enables getCloudflareContext() during `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
