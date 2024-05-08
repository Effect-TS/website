"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import React from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

export function Tutorial({
  workspace,
  navigation,
  next,
  children
}: {
  readonly workspace: string
  readonly navigation: React.ReactNode
  readonly children: React.ReactNode
  readonly next:
    | {
        readonly title: string
        readonly url: string
      }
    | undefined
}) {
  const Editor = editor(workspace)
  return (
    <PanelGroup
      autoSaveId="tutorial"
      direction="horizontal"
      className="flex-1 flex flex-row overflow-hidden"
    >
      <Panel className="pt-4 min-w-[450px] flex flex-col" defaultSize={30}>
        {navigation}
        <div className="p-6 prose flex-1 overflow-y-auto pb-14">
          {children}
          {next && (
            <p>
              <Link href={next.url}>Next: {next.title}</Link>
            </p>
          )}
        </div>
      </Panel>
      <PanelResizeHandle />
      <Panel>
        <Editor />
      </Panel>
    </PanelGroup>
  )
}

const editor = (workspace: string) =>
  dynamic(
    async () => {
      const ws = (await import(`@/workspaces/${workspace}`)).default
      const Editor = (await import("./CodeEditor")).CodeEditor
      return () => (<Editor workspace={ws} />) as any
    },
    { ssr: false }
  )
