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

export default nextConfig;
