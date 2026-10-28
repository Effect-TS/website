import { afterEach, assert, test, vi } from "vite-plus/test"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { AlchemyContext } from "alchemy/AlchemyContext"
import { provideFreshArtifactStore } from "alchemy/Artifacts"
import * as Interaction from "alchemy/Interaction"
import * as Output from "alchemy/Output"
import { evalStack } from "alchemy/Stack"
import { Stage } from "alchemy/Stage"
import * as State from "alchemy/State"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import EffectWebsite from "../../../../alchemy.run.ts"

// Each resource of a preview whose search content changed, with the resources
// its props reference. Apply runs a resource only after these.
const previewGraph = async () => {
  for (const [name, value] of Object.entries({
    PULL_REQUEST: "1638",
    MXBAI_PREVIEW_STORE_ENABLED: "true",
    WEBSITE_REVISION: "0123456789abcdef0123456789abcdef01234567",
    MXBAI_API_KEY: "search-key",
    MXBAI_PREVIEW_SEARCH_API_KEY: "preview-search-key",
    MXBAI_VECTOR_STORE_ID: "production-store",
    KV_REST_API_URL: "https://kv.example.com",
    KV_REST_API_TOKEN: "kv-token",
  })) {
    vi.stubEnv(name, value)
  }
  const dotAlchemy = await mkdtemp(join(tmpdir(), "preview-stack-"))
  return Effect.runPromise(
    evalStack(
      EffectWebsite,
      (stack) =>
        Effect.succeed(
          new Map(
            Object.values(stack.resources).map((resource) => [
              resource.LogicalId,
              Object.values(
                Output.upstreamAny([
                  resource.Props,
                  stack.bindings[resource.FQN] ?? [],
                ]),
              ).map((upstream) => upstream.LogicalId),
            ]),
          ),
        ),
      { stage: "pr-1638" },
    ).pipe(
      provideFreshArtifactStore,
      Effect.provideService(AlchemyContext, {
        dotAlchemy,
        updateStateStore: false,
        dev: false,
        adopt: false,
      }),
      Effect.provideService(Stage, "pr-1638"),
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          State.inMemoryState(),
          Interaction.layerNonInteractive(),
        ),
      ),
      Effect.ensuring(
        Effect.promise(() => rm(dotAlchemy, { recursive: true, force: true })),
      ),
    ),
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
})

const dependsOn = (
  graph: ReadonlyMap<string, ReadonlyArray<string>>,
  from: string,
  to: string,
): boolean => {
  const seen = new Set<string>()
  const pending = [...(graph.get(from) ?? [])]
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    if (id === to) return true
    if (seen.has(id)) continue
    seen.add(id)
    pending.push(...(graph.get(id) ?? []))
  }
  return false
}

test("a preview builds the website while its search index syncs, and comments only after both", async () => {
  const graph = await previewGraph()

  assert.isTrue(dependsOn(graph, "WebsiteWorker", "PreviewSearchStore"))
  assert.isFalse(dependsOn(graph, "WebsiteWorker", "SynchronizePreviewSearch"))
  assert.isTrue(dependsOn(graph, "preview-comment", "WebsiteWorker"))
  assert.isTrue(dependsOn(graph, "preview-comment", "SynchronizePreviewSearch"))
}, 60_000)
