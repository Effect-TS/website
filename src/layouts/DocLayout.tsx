import stackblitz, { type VM } from '@stackblitz/sdk'
import classnames from 'classnames'
import type * as types from 'contentlayer/generated'
import { useMDXComponent } from 'next-contentlayer/hooks'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { Callout } from '../components/Callout'
import { Card } from '../components/Card'
import { Layout } from '../components/Layout'
import { Player } from '../components/Player'
import { TreeNode, TreeRoot } from '../utils/tree'

export const Playground: FC<{ project: string; file?: string }> = ({ project, file }) => {
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

const Code: FC = ({ children }) => {
  if (Array.isArray(children) && children.every((c) => c && c.props && c.props.className === 'line')) {
    const lines = children.length
    const len = `${lines}`.length
    return (
      <code>
        {children.map((line, i) => {
          return (
            <div key={`line-${i}`} style={{ display: 'flex' }}>
              <span style={{ width: `${len}em`, color: 'rgb(203, 213, 225)' }}>{i + 1}</span>
              {line}
            </div>
          )
        })}
      </code>
    )
  }
  return <code>{children}</code>
}

export const H2: FC = ({ children }) => (
  <>
    <h2 className="text-xl">{children}</h2>
    <br></br>
  </>
)

const mdxComponents = {
  Callout,
  Card,
  Image,
  Link,
  Player,
  code: Code,
  Playground,
  h2: H2,
}

export const DocLayout: FC<{ doc: types.Doc; tree: TreeRoot<types.Doc>; childrenTree: TreeNode<types.Doc>[] }> = ({
  doc,
  tree,
  childrenTree,
}) => {
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
            <Tree tree={tree} level={0} activeUrlPath={router.asPath} />
          </div>
        </aside>
        <div style={{ marginLeft: `max(calc(50% - 32rem), ${SIDEBAR_WIDTH}px)`, width: '100%', overflow: 'auto' }}>
          <div className="flex-1 px-12 py-8 max-w-7xl markdown">
            <h1 className="text-2xl">{doc.title}</h1>
            <br></br>
            {MDXContent !== null && <MDXContent components={mdxComponents} />}
            {doc.show_child_cards && <ChildCards tree={childrenTree} />}
          </div>
        </div>
      </div>
    </Layout>
  )
}

const Tree: FC<{ tree: TreeRoot<types.Doc>; level: number; activeUrlPath: string }> = ({
  tree,
  level,
  activeUrlPath,
}) => (
  <div style={{ paddingLeft: level * 12 }} className="mb-2 space-y-1">
    {tree.map((treeNode, index) => (
      <React.Fragment key={`${treeNode.urlPath}-${index}`}>
        <Link href={treeNode.urlPath}>
          <a
            className={classnames(
              'py-2 px-4 no-underline text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center space-x-2.5',
              activeUrlPath === treeNode.urlPath
                ? 'bg-gray-100 text-black dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 dark:text-gray-400',
            )}
          >
            <span>{treeNode.nav_title || treeNode.title}</span>
          </a>
        </Link>
        {treeNode.children.length > 0 && (
          <Tree tree={treeNode.children} level={level + 1} activeUrlPath={activeUrlPath} />
        )}
      </React.Fragment>
    ))}
  </div>
)

const ChildTreeItem: FC<{ item: TreeNode<types.Doc> }> = ({ item }) => {
  return (
    <Card
      title={item.title}
      label={item.label}
      subtitle={item.excerpt}
      link={{ label: 'View Page', url: item.urlPath }}
    />
  )
}

const ChildCards: FC<{ tree: TreeNode<types.Doc>[] }> = ({ tree }) => {
  return (
    <div className="grid gap-4 mt-12 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {tree.map((item, idx) => (
        <ChildTreeItem key={idx} {...{ item }} />
      ))}
    </div>
  )
}
