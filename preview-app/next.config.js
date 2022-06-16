const { withContentlayer } = require('next-contentlayer')

module.exports = withContentlayer({
  async redirects() {
    return [
      {
        source: '/',
        destination: '/docs',
        permanent: false
      },
      {
        source: '/docs',
        destination: '/docs/what-is-effect',
        permanent: false
      },
    ]
  },
})
