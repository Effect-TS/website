import { assert, test } from "vite-plus/test"
import {
  type ApiReferenceOpenGraphEntry,
  resolveApiReferenceOpenGraph,
} from "../../../src/features/api-reference/open-graph.ts"
import {
  loadAssets,
  renderApiReferenceOg,
} from "../../../src/services/OpenGraph.ts"

const entries = [
  {
    version: "v4",
    revision: "revision-v4",
    packageName: "effect",
    packageSlug: "effect",
    packageDescription: "The Effect core package.",
    modulePath: "Effect",
  },
  {
    version: "v4",
    revision: "revision-v4",
    packageName: "effect",
    packageSlug: "effect",
    packageDescription: "The Effect core package.",
    modulePath: "unstable/http/HttpClient",
  },
  {
    version: "v3",
    revision: "revision-v3",
    packageName: "@effect/platform-node",
    packageSlug: "platform-node",
    packageDescription: "Node.js integrations for Effect.",
    modulePath: "NodeHttpClient",
  },
] satisfies ReadonlyArray<ApiReferenceOpenGraphEntry>

test("resolves a version index", () => {
  assert.deepEqual(resolveApiReferenceOpenGraph("docs/v4/api", entries), {
    description: "Browse the Effect v4 API reference by package and module.",
    revision: "revision-v4",
    template: {
      eyebrow: "Effect Docs",
      title: "API Reference",
    },
  })
})

test("resolves a scoped package index", () => {
  assert.deepEqual(
    resolveApiReferenceOpenGraph("docs/v3/api/platform-node", entries),
    {
      description: "Node.js integrations for Effect.",
      revision: "revision-v3",
      template: {
        eyebrow: "API Reference",
        title: "@effect/platform-node",
      },
    },
  )
})

test("resolves a nested module", () => {
  assert.deepEqual(
    resolveApiReferenceOpenGraph(
      "docs/v4/api/effect/unstable/http/HttpClient",
      entries,
    ),
    {
      description: "Unstable HttpClient API reference for effect.",
      revision: "revision-v4",
      template: {
        eyebrow: "API Reference",
        title: "HttpClient",
      },
    },
  )
})

test("rejects unknown or malformed routes", () => {
  assert.equal(resolveApiReferenceOpenGraph("docs/v5/api", entries), undefined)
  assert.equal(
    resolveApiReferenceOpenGraph("docs/v4/api/unknown", entries),
    undefined,
  )
  assert.equal(
    resolveApiReferenceOpenGraph("docs/v4/api/effect/unknown", entries),
    undefined,
  )
  assert.equal(
    resolveApiReferenceOpenGraph("docs/v4/getting-started", entries),
    undefined,
  )
})

test("renders a 1200 by 630 PNG", async () => {
  const image = await renderApiReferenceOg(
    {
      eyebrow: "API Reference",
      title: "HttpClient",
    },
    await loadAssets(new URL("../../../src/", import.meta.url)),
  )
  const view = new DataView(image.buffer, image.byteOffset, image.byteLength)

  assert.deepEqual(
    image.slice(0, 8),
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
  )
  assert.equal(view.getUint32(16), 1200)
  assert.equal(view.getUint32(20), 630)
})
