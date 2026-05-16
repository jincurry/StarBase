/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    const target = process.env.API_BASE_INTERNAL || "http://localhost:8080";
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
    ];
  },
};
module.exports = nextConfig;
