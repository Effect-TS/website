import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react';
import {useCustomStyle} from '@/hooks/useCustomStyle'

export default function App({ Component, pageProps }: AppProps) {

  useCustomStyle()

  return <Component {...pageProps} />
}
