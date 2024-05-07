"use client"

import React from "react"
import dynamic from "next/dynamic"

export declare namespace Tutorial {
  export interface Props {
    readonly workspace: string
    readonly children: React.ReactNode
  }
}

export const Tutorial: React.FC<Tutorial.Props> = ({
  workspace,
  children
}) => {
  const Editor = editor(workspace)
  return (
    <div className="h-full flex flex-row">
      <div className="basis-1/2">{children}</div>
      <div className="basis-1/2">
        <Editor />
      </div>
    </div>
  )
}

const editor = (workspace: string) =>
  dynamic(
    async () => {
      const ws = (await import(`@/workspaces/${workspace}`)).default
      const Editor = (await import("./components/CodeEditor")).CodeEditor
      return () => (<Editor workspace={ws} />) as any
    },
    { ssr: false }
  )
