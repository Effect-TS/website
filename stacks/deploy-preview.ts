import * as Alchemist from "alchemy/Alchemist"
import * as Effect from "effect/Effect"
import { appendFile } from "node:fs/promises"
import PreviewStack from "./preview.ts"

// Deploys the requested preview and hands its URL to the workflow as the
// step output `url`.
const stage = process.argv[2]
if (!stage) {
  throw new Error("Usage: node stacks/deploy-preview.ts <stage>")
}

const program = Effect.gen(function* () {
  const plan = yield* Alchemist.plan({
    stack: PreviewStack,
    stage,
    operation: "deploy",
    updateStateStore: true,
  })
  const output = yield* Alchemist.apply(plan)
  const url = output?.websiteUrl
  if (typeof url !== "string" || !url.startsWith("https://")) {
    return yield* Effect.fail(
      new Error(
        `Missing valid websiteUrl in stack output: ${JSON.stringify(output)}`,
      ),
    )
  }
  const githubOutput = process.env.GITHUB_OUTPUT
  if (githubOutput !== undefined) {
    yield* Effect.promise(() => appendFile(githubOutput, `url=${url}\n`))
  }
  console.log(`Deployed requested preview: ${url}`)
}).pipe(Effect.provide(Alchemist.layer()), Effect.scoped)

await Effect.runPromise(program)
