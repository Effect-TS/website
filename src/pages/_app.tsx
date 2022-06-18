import type { AppProps } from 'next/app'
import Head from 'next/head'
import React from 'react'

import '../styles/globals.css'

const script = `
(() => {
  const setDark = () => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  };
  const setLight = () => {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  };
  const setColorMode = (bind) => {
    if (localStorage && localStorage.theme) {
      if (localStorage.theme === 'dark') {
        setDark();
        return;
      } else if (localStorage.theme === 'light') {
        setLight();
        return;
      }
    }
    const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeMedia.matches) {
      setDark();
    } else {
      setLight();
    }
    if (bind) {
      themeMedia.onchange = () => setColorMode(false);
    }
  };
  setColorMode(true);
  window.setColorMode = () => setColorMode(false);
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
