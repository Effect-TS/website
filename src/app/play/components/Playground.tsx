"use client"

import { CodeEditor } from "@/components/editor/CodeEditor"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRxSuspenseSuccess, useRxValue } from "@effect-rx/rx-react"
import { Suspense } from "react"
import { importRx } from "../rx"

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
    <main className="relative flex flex-col h-full w-full z-0">
      <CodeEditor workspace={workspace} />
    </main>
  )
}
