"use client"

import { CodeEditor } from "@/components/editor/CodeEditor"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { Suspense } from "react"
import { importRx } from "@/components/editor/rx/share"

export function Playground() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading playground..." />}>
      <PlaygroundLoader />
    </Suspense>
  )
}

function PlaygroundLoader() {
  const workspace = useRxSuspenseSuccess(importRx).value
  return (
    <main className="flex flex-col h-full">
      <CodeEditor layout="playground" workspace={workspace} />
    </main>
  )
}
