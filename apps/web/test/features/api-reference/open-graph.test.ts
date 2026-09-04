import { assert, test } from "vite-plus/test"
import {
  type ApiReferenceOpenGraphEntry,
  resolveApiReferenceOpenGraph,
} from "../../../src/features/api-reference/open-graph.ts"

const entries = [
  {
    version: "v4",
    packageName: "effect",
    packageSlug: "effect",
    packageDescription: "The Effect core package.",
    modulePath: "Effect",
  },
  {
    version: "v4",
    packageName: "effect",
    packageSlug: "effect",
    packageDescription: "The Effect core package.",
    modulePath: "unstable/http/HttpClient",
  },
  {
    version: "v3",
    packageName: "@effect/platform-node",
    packageSlug: "platform-node",
    packageDescription: "Node.js integrations for Effect.",
    modulePath: "NodeHttpClient",
  },
] satisfies ReadonlyArray<ApiReferenceOpenGraphEntry>

test("resolves a version index", () => {
  assert.deepEqual(resolveApiReferenceOpenGraph("docs/v4/api", entries), {
    description: "Browse the Effect v4 API reference by package and module.",
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
