import * as _Doc from '@effect/printer/Doc'
import * as _DocStream from '@effect/printer/DocStream'
import * as _DocTree from '@effect/printer/DocTree'
import * as _Flatten from '@effect/printer/Flatten'
import * as _Layout from '@effect/printer/Layout'
import * as _Optimize from '@effect/printer/Optimize'
import * as _PageWidth from '@effect/printer/PageWidth'
import * as _Render from '@effect/printer/Render'

const Doc: Omit<typeof _Doc, never> = _Doc
const DocStream: Omit<typeof _DocStream, never> = _DocStream
const DocTree: Omit<typeof _DocTree, never> = _DocTree
const Flatten: Omit<typeof _Flatten, never> = _Flatten
const Layout: Omit<typeof _Layout, never> = _Layout
const Optimize: Omit<typeof _Optimize, never> = _Optimize
const PageWidth: Omit<typeof _PageWidth, never> = _PageWidth
const Render: Omit<typeof _Render, never> = _Render

export type Doc<A> = _Doc.Doc<A>
export type DocStream<A> = _DocStream.DocStream<A>
export type DocTree<A> = _DocTree.DocTree<A>
export type Flatten<A> = _Flatten.Flatten<A>
export type Layout<A> = _Layout.Layout<A>
export type Optimize<A> = _Optimize.Optimize<A>
export type PageWidth = _PageWidth.PageWidth

export { Doc, DocStream, DocTree, Flatten, Layout, Optimize, PageWidth, Render }
