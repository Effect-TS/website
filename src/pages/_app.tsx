import type { AppProps } from 'next/app'
import Head from 'next/head'
import React from 'react'

import '../styles/globals.css'

const script = `
(() => {
  if (localStorage && localStorage.theme) {
    if (localStorage.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  } else {
    const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeMedia.matches) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    themeMedia.onchange = (event) => {
      if (event.matches) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }
})();
`

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: script,
          }}
        ></script>
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
