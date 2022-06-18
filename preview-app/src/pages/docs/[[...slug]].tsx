import type { InferGetStaticPropsType } from 'next'
import { useLiveReload } from 'next-contentlayer/hooks'
import type { FC } from 'react'
import { allDocs } from 'contentlayer/generated'
import { Doc } from 'contentlayer/generated'

import { DocLayout } from '../../layouts/DocLayout'
import { defineStaticProps, toParams } from '../../utils/next'
import { PathSegment, buildTreeNode } from '../../utils/tree'

export const getStaticPaths = async () => {
  const paths = allDocs.map((_) => _.pathSegments.map((_: PathSegment) => _.pathName).join('/')).map(toParams)

  return { paths, fallback: 'blocking' }
}

export const getStaticProps = defineStaticProps(async (context) => {
  const params = context.params as any
  const pagePath = params.slug?.join('/') ?? ''

  const doc = allDocs.find((_) => _.pathSegments.map((_: PathSegment) => _.pathName).join('/') === pagePath)!

  if (doc === undefined) {
    return {
      redirect: { destination: '/', statusCode: 301 },
    }
  }
  
  const tree = buildTreeNode(allDocs)
  const childrenTree = buildTreeNode(
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
