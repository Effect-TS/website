"use client"

import React, { useMemo } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { File, makeDirectory, Workspace } from "@/workspaces/domain/workspace"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable"
import { tutorialWorkspaces } from "@/tutorials/common"
import { Tutorial as ITutorial } from "contentlayer/generated"

export const Tutorial = ({
  name,
  files,
  navigation,
  workspace,
  next,
  children
}: {
  readonly name: string
  readonly files: ReadonlyArray<{
    readonly name: string
    readonly initial: string
    readonly solution: string | undefined
  }>
  readonly workspace: ITutorial["workspace"]
  readonly navigation: React.ReactNode
  readonly children: React.ReactNode
  readonly next:
    | {
        readonly title: string
        readonly url: string
      }
    | undefined
}) => {
  const Editor = useMemo(
    () =>
      editor(
        tutorialWorkspaces[workspace].withName(name).append(
          makeDirectory(
            "src",
            files.map(
              (file) =>
                new File({
                  name: file.name,
                  initialContent: file.initial,
                  solution: file.solution
                })
            )
          )
        )
      ),
    [files, name, workspace]
  )

  return (
    <ResizablePanelGroup
      autoSaveId="tutorial"
      direction="horizontal"
      className="flex-1 flex flex-row overflow-hidden"
    >
      <ResizablePanel
        className="pt-4 min-w-[450px] flex flex-col"
        defaultSize={30}
      >
        {navigation}
        <div className="px-8 py-2 prose dark:prose-invert flex-1 overflow-y-auto pb-14">
          {children}
          {next && (
            <p>
              <Link href={next.url}>Next: {next.title}</Link>
            </p>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <Editor />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

const editor = (workspace: Workspace) =>
  dynamic(
    async () => {
      const Editor = (await import("@/components/editor/CodeEditor"))
        .CodeEditor
      return () => (<Editor workspace={workspace} />) as any
    },
    { ssr: false }
  )
