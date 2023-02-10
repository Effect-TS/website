import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import { useLiveReload } from 'next-contentlayer/hooks'
import type { FC } from 'react'
import * as Option from '@fp-ts/core/Option'
import { allDocs } from 'contentlayer/generated'
import * as ReadonlyArray from '@fp-ts/core/ReadonlyArray'
import * as Sidebar from '../../lib/sidebar'
import { pipe } from '@fp-ts/core/Function'
import { defineStaticProps } from '../../lib/next'
import { DocLayout } from 'src/layouts/DocLayout'

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: allDocs.map((doc) => {
    const navMeta = doc.navigationMetadata as ReadonlyArray<Sidebar.NavigationMetadata>
    return { params: { slug: navMeta.map((meta) => meta.path) } }
  }),
  fallback: false,
})

export declare namespace DocumentationPage {
  export interface Props {
    readonly slug: string
  }
}

export const getStaticProps = defineStaticProps(({ params }) => {
  if (params === undefined || params.slug === undefined || !Array.isArray(params.slug)) {
    return {
      notFound: true,
    }
  }
  const slug = params.slug.join('/')
  const option = pipe(
    allDocs,
    ReadonlyArray.findFirst((doc) => {
      const navMeta = doc.navigationMetadata as ReadonlyArray<Sidebar.NavigationMetadata>
      const pagePath = navMeta.map((meta) => meta.path).join('/')
      return pagePath === slug
    }),
  )
  if (Option.isNone(option)) {
    return {
      redirect: { destination: '/', statusCode: 301 },
    }
  }
  const doc = option.value
  const navMeta = doc.navigationMetadata as ReadonlyArray<Sidebar.NavigationMetadata>
  const rootTree = Sidebar.makeTree(allDocs)
  const childTree = Sidebar.makeTree(
    allDocs,
    navMeta.map((meta) => meta.path),
  )
  return { props: { doc, rootTree, childTree } }
})

const DocumentationPage: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({ doc, rootTree, childTree }) => {
  useLiveReload()
  return <DocLayout doc={doc} rootTree={rootTree} childTree={childTree} />
}

export default DocumentationPage
