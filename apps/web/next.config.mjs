/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/journal', destination: 'http://localhost:3001/journal' },
    ];
  },
};

export default nextConfig;
