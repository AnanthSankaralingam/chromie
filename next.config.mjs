/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // serverActions: true, // removed as per Next.js warning
  },
  eslint: {
    ignoreDuringBuilds: false, // Changed to false for production
  },
  typescript: {
    ignoreBuildErrors: false, // Changed to false for production
  },
  images: {
    unoptimized: false, // Changed to false for production
  },
  // Add production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
}

export default nextConfig
