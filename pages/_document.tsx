import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  // Netlify URL https://docs.netlify.com/configure-builds/environment-variables/#deploy-urls-and-metadata
  const deployUrl = process.env.DEPLOY_URL ?? "https://effect.website"

  const metaTitle = "Effect"
  const metaDescription = "A set of libraries to write better TypeScript"

  return (
    <Html lang="en">
      <Head>
        <meta name="og:title" content={metaTitle} />
        <meta name="og:description" content={metaDescription} />
        <meta
          name="og:image"
          // NOTE og:image must be an absolute url
          content={`${deployUrl}/og.png`}
        />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {/* NOTE twitter:image must be an absolute url */}
        <meta name="twitter:image" content={`${deployUrl}/twitter.png`} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
