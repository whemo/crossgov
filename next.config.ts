import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack for local development only
  turbopack: {},
  // Vercel builds use production build system
}

export default nextConfig
