const { withContentlayer } = require("next-contentlayer")

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com"
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc"
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com"
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com"
      }
    ]
  },
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/docs/introduction",
        permanent: true
      },
      {
        source: "/docs/",
        destination: "/docs/introduction/",
        permanent: true
      }
    ]
  },
  rewrites: () => [
    {
      source: "/events",
      destination: "https://webflow.effect.website/events/effect-days"
    },
    {
      source: "/events/",
      destination: "https://webflow.effect.website/events/effect-days/"
    },
    {
      source: "/events/:path*",
      destination: "https://webflow.effect.website/events/:path*"
    }
  ],
  async headers() {
    return [
      {
        source: "/vendor/(.*)",
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
      },
      {
        source: "/play",
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
  }
}

module.exports = withContentlayer(nextConfig)
