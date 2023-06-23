import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  // Netlify URL https://docs.netlify.com/configure-builds/environment-variables/#deploy-urls-and-metadata
  const deployUrl = process.env.DEPLOY_URL
    ? "https://" + process.env.DEPLOY_URL
    : "https://effect.website"

  return (
    <Html lang="en">
      <Head>
        <meta name="og:title" content="Vercel Edge Network" />
        <meta name="og:description" content="Vercel Edge Network" />
        <meta
          name="og:image"
          // NOTE og:image must be an absolute url
          content={`${deployUrl}/twitter.png`}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
