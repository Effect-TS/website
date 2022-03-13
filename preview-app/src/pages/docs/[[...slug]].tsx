import type { InferGetStaticPropsType } from 'next'
import { useLiveReload } from 'next-contentlayer/hooks'
import type { FC } from 'react'
import { allDocs } from 'contentlayer/generated'
import { Doc } from 'contentlayer/generated'

import { DocLayout } from '../../layouts/DocLayout'
import { defineStaticProps, toParams } from '../../utils/next'

export const getStaticPaths = async () => {
  const paths = allDocs.map((_) => _.pathSegments.map((_: PathSegment) => _.pathName).join('/')).map(toParams)
  console.log(JSON.stringify(paths))

  return { paths, fallback: 'blocking' }
}

export const getStaticProps = defineStaticProps(async (context) => {
  const params = context.params as any
  const pagePath = params.slug?.join('/') ?? ''

  const doc = allDocs.find((_) => _.pathSegments.map((_: PathSegment) => _.pathName).join('/') === pagePath)!

  // if (doc === undefined) {
  //   return {
  //     redirect: { destination: '/docs', statusCode: 301 },
  //   } as never // return as `never` to not confuse `InferGetStaticPropsType`
  // }

  const tree = buildTree(allDocs)
  const childrenTree = buildTree(
    allDocs,
    doc.pathSegments.map((_: PathSegment) => _.pathName),
  )

  return { props: { doc, tree, childrenTree } }
})

const Page: FC<InferGetStaticPropsType<typeof getStaticProps>> = ({ doc, tree, childrenTree }) => {
  useLiveReload()

  return <DocLayout {...{ doc, tree, childrenTree }} />
}

export default Page

export type TreeRoot = TreeNode[]

export type TreeNode = {
  title: string
  nav_title: string | null
  label: string | null
  excerpt: string | null
  urlPath: string
  children: TreeNode[]
}

type PathSegment = { order: number; pathName: string }

const buildTree = (docs: Doc[], parentPathNames: string[] = []): TreeNode[] => {
  const level = parentPathNames.length

  return docs
    .filter(
      (_) =>
        _.pathSegments.length === level + 1 &&
        _.pathSegments
          .map((_: PathSegment) => _.pathName)
          .join('/')
          .startsWith(parentPathNames.join('/')),
    )
    .sort((a, b) => a.pathSegments[level].order - b.pathSegments[level].order)
    .map<TreeNode>((doc) => ({
      nav_title: doc.nav_title ?? null,
      title: doc.title,
      label: doc.label ?? null,
      excerpt: doc.excerpt ?? null,
      urlPath: '/docs/' + doc.pathSegments.map((_: PathSegment) => _.pathName).join('/'),
      children: buildTree(
        docs,
        doc.pathSegments.map((_: PathSegment) => _.pathName),
      ),
    }))
}
