"use client"
import React from "react"
import dynamic from "next/dynamic"

export function Tutorial({
  workspace,
  children
}: {
  readonly workspace: string
  readonly children: React.ReactNode
}) {
  const Editor = editor(workspace)
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <div className="flex-1">
        <Editor />
      </div>
    </div>
  )
}

const editor = (workspace: string) =>
  dynamic(
    async () => {
      const ws = (await import(`@/workspaces/${workspace}`)).default
      const CodeEditor = (await import("./CodeEditor")).CodeEditor
      return () => (<CodeEditor workspace={ws} />) as any
    },
    { ssr: false }
  )
