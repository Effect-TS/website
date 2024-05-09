"use client"

import { CodeEditor } from "@/CodeEditor/CodeEditor"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { Suspense } from "react"
import { importRx } from "../rx/share"
import { ShareButton } from "./ShareButton"

export function Playground() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PlaygroundLoader />
    </Suspense>
  )
}

function PlaygroundLoader() {
  const workspace = useRxSuspenseSuccess(importRx).value
  return (
    <main className="flex flex-col h-full">
      <CodeEditor workspace={workspace} aboveExplorer={<ShareButton />} />
    </main>
  )
}
