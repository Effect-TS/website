const { withContentlayer } = require('next-contentlayer')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com'
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com'
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp"
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin"
          }
        ]
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/docs/introduction',
        permanent: true
      },
      {
        source: '/docs/',
        destination: '/docs/introduction/',
        permanent: true
      }
    ]
  }
}

module.exports = withContentlayer(nextConfig)
