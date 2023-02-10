import type { FC } from 'react'
import { Helmet } from 'react-helmet'

import type * as types from 'contentlayer/generated'

import { Header } from './Header'

export const Layout: React.FC<
  React.PropsWithChildren<{
    doc: types.Doc
  }>
> = ({ doc, children }) => {
  return (
    <>
      <Helmet>
        <title>{doc.title}</title>
      </Helmet>

      <Header />

      <div id="page" className="h-full pt-[57px]">
        {children}
      </div>
    </>
  )
}
