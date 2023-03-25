const { withContentlayer } = require('next-contentlayer')

module.exports = withContentlayer({
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/docs',
        permanent: false,
      },
      {
        source: '/docs',
        destination: '/docs/welcome-to-effect',
        permanent: false,
      },
    ]
  },
})
