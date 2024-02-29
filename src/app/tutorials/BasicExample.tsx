"use client"
import { FileWithContent } from "@/services/WebContainer"
import { CodeEditor, effectWorkspace } from "./CodeEditor"

const workspace = effectWorkspace.copyWith("basic", [
  new FileWithContent({
    file: "index.ts",
    initialContent: `import { Effect } from "effect"

Effect.runFork(Effect.log("Hello, world!"))`
  })
])

export default function BasicExample() {
  return <CodeEditor workspace={workspace} />
}
