"use client"

import { CodeEditor } from "@/components/editor"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { Suspense } from "react"
import { importRx } from "@/components/editor/rx/share"

export declare namespace Playground {
  export interface Props {}
}

export const Playground: React.FC<Playground.Props> = () => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading playground..." />}>
      <PlaygroundLoader />
    </Suspense>
  )
}

Playground.displayName = "Playground"

export declare namespace PlaygroundLoader {
  export interface Props {}
}

const PlaygroundLoader: React.FC<PlaygroundLoader.Props> = () => {
  const workspace = useRxSuspenseSuccess(importRx).value
  return (
    <main className="flex flex-col h-full">
      <CodeEditor layout="playground" workspace={workspace} />
    </main>
  )
}

PlaygroundLoader.displayName = "PlaygroundLoader"