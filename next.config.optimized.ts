import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable bundle analyzer in development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: './bundle-analysis.html',
          })
        )
      }
      return config
    },
  }),

  // Optimize bundle splitting
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      'lucide-react',
    ],
  },

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Compress responses
  compress: true,

  // Enable SWC minification
  swcMinify: true,

  // Optimize CSS
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error'],
      },
    },
  }),

  // Headers for better caching
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=86400',
          },
        ],
      },
    ]
  },

  // Redirects for optimization
  async redirects() {
    return [
      {
        source: '/dashboard/training/create',
        destination: '/dashboard/training/create/optimized',
        permanent: false,
      },
      {
        source: '/dashboard/training/:id',
        destination: '/dashboard/training/:id/optimized',
        permanent: false,
      },
      {
        source: '/dashboard/employee/training/:id',
        destination: '/dashboard/employee/training/:id/optimized',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
