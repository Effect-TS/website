/** @type {import("next").NextConfig} */
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
  ]
}

module.exports = nextConfig
