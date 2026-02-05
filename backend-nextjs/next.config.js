/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure body size limit for API routes (audio files can be large)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

module.exports = nextConfig
