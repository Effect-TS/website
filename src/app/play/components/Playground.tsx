"use client"

import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Workspace } from "@/domain/Workspace"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { ShareButton } from "./ShareButton"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { importRx } from "../rx/share"

export function Playground() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PlaygroundLoader />
    </Suspense>
  )
}

function PlaygroundLoader() {
  const workspace = useRxSuspenseSuccess(importRx).value
  const Editor = editor(workspace)
  return (
    <main className="flex flex-col h-full">
      <Editor />
    </main>
  )
}

const editor = (workspace: Workspace) =>
  dynamic(
    async () => {
      const Editor = (await import("@/CodeEditor/CodeEditor")).CodeEditor
      return () =>
        (
          <Editor workspace={workspace} aboveExplorer={<ShareButton />} />
        ) as any
    },
    { ssr: false }
  )
