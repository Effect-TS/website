import * as Alchemist from "alchemy/Alchemist"
import * as Effect from "effect/Effect"
import { writeFile } from "node:fs/promises"
import PreviewStack from "./preview.ts"

const stage = process.argv[2]
const outputFile = process.argv[3]

if (!stage) {
  throw new Error("Usage: node stacks/deploy-preview.ts <stage> [outputFile]")
}

const program = Effect.gen(function* () {
  const plan = yield* Alchemist.plan({
    stack: PreviewStack,
    stage,
    operation: "deploy",
    updateStateStore: true,
  })
  const output = yield* Alchemist.apply(plan)
  if (
    typeof output?.websiteUrl !== "string" ||
    !output.websiteUrl.startsWith("https://")
  ) {
    return yield* Effect.fail(
      new Error(
        `Missing valid websiteUrl in stack output: ${JSON.stringify(output)}`,
      ),
    )
  }
  if (outputFile !== undefined) {
    yield* Effect.promise(() =>
      writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`),
    )
  }
  console.log(`Deployed requested preview: ${output.websiteUrl}`)
  return output
}).pipe(Effect.provide(Alchemist.layer()), Effect.scoped)

await Effect.runPromise(program)
