import {Navigation} from '@/components/docs/navigation'
import {ReactNode} from 'react'

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <div className="docs-container w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-16 flex">
      <Navigation />
      {children}
    </div>
  )
}
