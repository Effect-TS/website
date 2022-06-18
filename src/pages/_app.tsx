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
  const listeners = {
    current: []
  };
  const setColorMode = (bind) => {
    const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (localStorage && localStorage.theme) {
      if (localStorage.theme === 'dark') {
        setDark();
      } else if (localStorage.theme === 'light') {
        setLight();
      }
    }
    if (!localStorage || !localStorage.theme || localStorage.theme === "system") {
      if (themeMedia.matches) {
        setDark();
      } else {
        setLight();
      }
    }
    if (bind) {
      themeMedia.onchange = () => setColorMode(false);
    }
    listeners.current.forEach((listener) => {
      listener();
    });
  };
  setColorMode(true);
  window.colorModeListeners = listeners;
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
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
