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
      source: "/events/:path*",
      destination: "https://webflow.effect.website/events/:path*",
    },
  ],
}

module.exports = withContentlayer(nextConfig)
