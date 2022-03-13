import type { FC } from 'react'
import { Helmet } from 'react-helmet'

import type * as types from 'contentlayer/generated'

import { Header } from './Header'

export const Layout: FC<{
  doc: types.Doc | types.Page
}> = ({ doc, children, ...props }) => {
  return (
    <>
      <Helmet>
        <title>{doc.title}</title>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🆑</text></svg>"
        />
      </Helmet>

      <Header />

      <div id="page" className="h-full pt-[57px]">
        {children}
      </div>
    </>
  )
}
