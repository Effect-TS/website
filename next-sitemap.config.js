/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.DEPLOY_URL ?? "https://effect.website",
  generateRobotsTxt: true,
}
