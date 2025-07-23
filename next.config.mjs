/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // serverActions: true, // removed as per Next.js warning
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
