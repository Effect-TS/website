import { FileWithContent } from "@/services/WebContainer"
import { effectWorkspace } from "../effect"

export default effectWorkspace.copyWith("step-01", [
  new FileWithContent({
    file: "index.ts",
    initialContent: `import { Effect } from "effect"

Effect.runFork(Effect.log("Hello, world!"))`
  }),
  new FileWithContent({
    file: "test.ts",
    initialContent: `import { Effect } from "effect"

Effect.runFork(Effect.log("Hello, test!"))`
  })
])
