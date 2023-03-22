import stackblitz, { type VM } from '@stackblitz/sdk'
import classnames from 'classnames'
import type * as types from 'contentlayer/generated'
import { useMDXComponent } from 'next-contentlayer/hooks'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { Callout } from '../components/Callout'
import { Card } from '../components/Card'
import { Layout } from '../components/Layout'
import { Player } from '../components/Player'
import * as Sidebar from '../lib/sidebar'

export const Playground: React.FC<{ project: string; file?: string }> = ({ project, file }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [vm, setVm] = useState<VM | undefined>(undefined)

  useEffect(() => {
    if (ref.current && vm === undefined) {
      stackblitz
        .embedGithubProject(ref.current, `effect-ts/docs/tree/code-examples/${project}`, {
          height: 700,
          view: 'editor',
          showSidebar: true,
          openFile: file ?? 'README.md',
        })
        .then((_) => setVm(_))
    }
  }, [ref, project, vm, file])

  return (
    <div className="overflow-hidden w-auto rounded-lg bg-gray-900 dark:bg-gray-900">
      <div className="h-[700px] w-full" ref={ref} />
    </div>
  )
}

const Code: React.FC<React.PropsWithChildren> = ({ children }) => {
  if (Array.isArray(children)) {
    const lines = children.length
    const len = `${lines}`.length
    let skip = 0
    return (
      <code>
        {children.map((line, i) => {
          if (line.props && line.props.className === 'line') {
            return (
              <div key={`line-${i}`} style={{ display: 'flex' }}>
                <span style={{ width: `${len}em`, color: 'rgb(203, 213, 225)' }}>{i + 1 - skip}</span>
                {line}
              </div>
            )
          }
          skip++
          return (
            <div key={`line-${i}`} style={{ display: 'flex' }}>
              {line}
            </div>
          )
        })}
      </code>
    )
  }
  if (typeof children === 'object') {
    return (
      <code>
        {' '}
        <div key={`line-1`} style={{ display: 'flex' }}>
          <span style={{ width: `1em`, color: 'rgb(203, 213, 225)' }}>{1}</span>
          {children}
        </div>
      </code>
    )
  }
  return <code>{children}</code>
}

export const H2: React.FC<React.PropsWithChildren> = ({ children }) => (
  <>
    <h2>{children}</h2>
  </>
)

const List: React.FC<React.PropsWithChildren> = ({ children }) => <ul>{children}</ul>

const ListItem: React.FC<React.PropsWithChildren> = ({ children }) => <li className="mb-2">{children}</li>

const mdxComponents = {
  Callout,
  Card,
  Image,
  Link,
  Player,
  code: Code,
  Playground,
  h2: H2,
  ul: List,
  li: ListItem,
}

export const DocLayout: React.FC<{
  doc: types.Doc
  rootTree: Sidebar.TreeRoot<types.Doc>
  childTree: ReadonlyArray<Sidebar.TreeNode<types.Doc>>
}> = ({ doc, rootTree, childTree }) => {
  const router = useRouter()
  const SIDEBAR_WIDTH = 320
  const HEADER_HEIGHT = 60

  const MDXContent = useMDXComponent(doc.body.code!)

  return (
    <Layout doc={doc}>
      <div className="flex">
        <aside
          className="fixed"
          style={{
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            width: SIDEBAR_WIDTH,
            top: HEADER_HEIGHT,
          }}
        >
          <div className="overflow-y-auto p-4 h-full border-r border-gray-100 dark:border-gray-800">
            <Tree tree={rootTree} level={0} activeUrlPath={router.asPath} />
          </div>
        </aside>
        <div style={{ marginLeft: `max(calc(50% - 32rem), ${SIDEBAR_WIDTH}px)`, width: '100%', overflow: 'auto' }}>
          <div className="flex-1 px-12 py-8 max-w-7xl">
          <div className="markdown">
            <h1 className="text-2xl">{doc.title}</h1>
            <br></br>
            <div className="docs prose prose-slate prose-violet mx-auto mb-4 w-full max-w-3xl shrink p-4 pb-8 prose-headings:font-semibold prose-a:font-normal prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-hr:border-gray-200 dark:prose-invert dark:prose-a:text-violet-400 dark:prose-hr:border-gray-800 md:mb-8 md:px-8 lg:mx-0 lg:max-w-full lg:px-16">
              {MDXContent !== null && <MDXContent components={mdxComponents} />}
            </div>
            {/* {doc.show_child_cards && <ChildCards tree={childrenTree} />} */}
          </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

const Tree: React.FC<{ tree: Sidebar.TreeRoot<types.Doc>; level: number; activeUrlPath: string }> = ({
  tree,
  level,
  activeUrlPath,
}) => (
  <div style={{ paddingLeft: level * 12 }} className="mb-2 space-y-1">
    {tree.map((treeNode, index) => (
      <React.Fragment key={`${treeNode.url}-${index}`}>
        <Link
          href={treeNode.url}
          className={classnames(
            'py-2 px-4 no-underline text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center space-x-2.5',
            activeUrlPath === treeNode.url
              ? 'bg-gray-100 text-black dark:bg-gray-800 dark:text-white'
              : 'text-gray-500 dark:text-gray-400',
          )}
        >
          <span>{treeNode.title}</span>
        </Link>
        {treeNode.children.length > 0 && (
          <Tree tree={treeNode.children} level={level + 1} activeUrlPath={activeUrlPath} />
        )}
      </React.Fragment>
    ))}
  </div>
)

// const ChildTreeItem: React.FC<{ item: Sidebar.TreeNode<types.Doc> }> = ({ item }) => {
//   return (
//     <Card
//       title={item.title}
//       label={item.label}
//       subtitle={item.excerpt}
//       link={{ label: 'View Page', url: item.urlPath }}
//     />
//   )
// }

// const ChildCards: React.FC<{ tree: Sidebar.TreeNode<types.Doc>[] }> = ({ tree }) => {
//   return (
//     <div className="grid gap-4 mt-12 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
//       {tree.map((item, idx) => (
//         <ChildTreeItem key={idx} {...{ item }} />
//       ))}
//     </div>
//   )
// }
