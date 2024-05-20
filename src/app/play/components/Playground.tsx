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
      <CodeEditor
        workspace={workspace}
        aboveExplorer={
          <>
            <ShareButton />
            <PlaygroundHeader />
          </>
        }
      />
    </main>
  )
}

function PlaygroundHeader() {
  return (
    <h3 className="px-3 pb-0 pt-3 uppercase font-bold text-xs text-slate-500 relative">
      Effect Playground
      <span className="font-mono normal-case absolute ml-1 mt-[-3px] text-slate-400 text-[10px]">
        Alpha
      </span>
    </h3>
  )
}
