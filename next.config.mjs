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
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent Next/Webpack from trying to bundle/resolve chromium-bidi & friends
      // These are server-only optional deps pulled by playwright-core
      config.externals = config.externals || []
      
      // Add rule to ignore binary and text files from Playwright that might cause parsing issues
      config.module = config.module || {}
      config.module.rules = config.module.rules || []
      config.module.rules.push({
        test: /\.(ttf|woff|woff2|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|html)$/,
        include: /playwright-core/,
        type: 'asset/resource',
        generator: {
          emit: false
        }
      })
      
      // Keep explicit ones added earlier
      config.externals.push({
        'chromium-bidi': 'commonjs chromium-bidi',
        'chromium-bidi/lib/cjs/bidiMapper/BidiMapper': 'commonjs chromium-bidi/lib/cjs/bidiMapper/BidiMapper',
        'playwright-core/lib/server/bidi/bidiChromium': 'commonjs playwright-core/lib/server/bidi/bidiChromium'
      })
      // Broad matcher for any chromium-bidi or playwright bidi internals
      config.externals.push(({ context, request }, callback) => {
        // Exclude chromium-bidi and related modules
        if (/^chromium-bidi(\/|$)/.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        if (/^playwright-core\/lib\/server\/bidi\//.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        
        // Exclude electron and related modules
        if (request === 'electron') {
          return callback(null, 'commonjs electron')
        }
        if (/^playwright-core\/lib\/server\/electron\//.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        
        // Exclude Playwright recorder modules (vite and server)
        if (/^playwright-core\/lib\/vite\/recorder\//.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        if (/^playwright-core\/lib\/server\/recorder\//.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        
        // Exclude Playwright's internal server modules that might cause bundling issues
        if (/^playwright-core\/lib\/server\//.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        
        // Exclude all binary and text assets from Playwright (fonts, images, HTML, etc.)
        if (/\.(ttf|woff|woff2|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|html)$/.test(request) && /playwright-core/.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        
        // Exclude any other Playwright internal modules that might cause issues
        if (/^playwright-core\/lib\/internal\//.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        if (/^playwright-core\/lib\/utils\//.test(request)) {
          return callback(null, 'commonjs ' + request)
        }
        
        return callback()
      })
    }
    return config
  }
}

export default nextConfig
