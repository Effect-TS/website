"use client"

import dynamic from "next/dynamic"
import React from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

export function Tutorial({
  workspace,
  navigation,
  children
}: {
  readonly workspace: string
  readonly navigation: React.ReactNode
  readonly children: React.ReactNode
}) {
  const Editor = editor(workspace)
  return (
    <PanelGroup
      autoSaveId="tutorial"
      direction="horizontal"
      className="flex-1 flex flex-row overflow-hidden"
    >
      <Panel className="pt-4">
        {navigation}
        <div className="p-6">{children}</div>
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
