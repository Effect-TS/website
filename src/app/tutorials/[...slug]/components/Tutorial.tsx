"use client"

import dynamic from "next/dynamic"
import React from "react"
import { Panel, PanelGroup } from "react-resizable-panels"
import { PanelResizeHandle } from "./PanelResizeHandle"

export function Tutorial({
  workspace,
  children
}: {
  readonly workspace: string
  readonly children: React.ReactNode
}) {
  const Editor = editor(workspace)
  return (
    <PanelGroup
      autoSaveId="tutorial"
      direction="horizontal"
      className="flex-1 flex flex-row overflow-hidden"
    >
      <Panel>{children}</Panel>
      <PanelResizeHandle direction="vertical" />
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
