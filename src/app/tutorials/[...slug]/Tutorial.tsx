"use client"

import React from "react"
import dynamic from "next/dynamic"

export declare namespace Tutorial {
  export interface Props {
    readonly workspace: string
    readonly children: React.ReactNode
  }
}

export const Tutorial: React.FC<Tutorial.Props> = ({ workspace, children }) => {
  const Editor = editor(workspace)
  return (
    <div className="h-full w-full grid grid-cols-2 gap-2">
      <div className="flex flex-col">{children}</div>
      <Editor />
    </div>
  )
}

const editor = (workspace: string) =>
  dynamic(
    async () => {
      const ws = (await import(`@/workspaces/${workspace}`)).default
      const Editor = ((await import("./CodeEditor")).CodeEditor)
      return () => (<Editor workspace={ws} />) as any
    },
    { ssr: false }
  )
