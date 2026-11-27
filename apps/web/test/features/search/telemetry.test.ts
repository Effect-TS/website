import { assert, test } from "vite-plus/test"
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Schema from "effect/Schema"
import * as Cause from "effect/Cause"
import {
  failureAttributes,
  requestAttributes,
  resultAttributes,
  scopeAttributes,
} from "../../../src/features/search/telemetry.ts"

test("describes the query by size only", () => {
  assert.deepEqual(requestAttributes("  Effect.gen error handling "), {
    "search.query.length_bucket": "11-25",
    "search.query.word_count_bucket": "2-3",
  })
})

test("tells production and preview stores apart", () => {
  assert.deepEqual(scopeAttributes({ store_identifiers: ["prod"] }), {
    "search.store.kind": "production",
    "search.store.hidden_file_count": 0,
  })
  assert.deepEqual(
    scopeAttributes({
      store_identifiers: ["prod", "pr-1"],
      file_ids: ["not_in", ["a", "b"]],
    }),
    {
      "search.store.kind": "preview",
      "search.store.hidden_file_count": 2,
    },
  )
})

test("counts results by kind", () => {
  const result = (kind: "documentation" | "blog") =>
    ({ kind }) as Parameters<typeof resultAttributes>[0][number]
  assert.deepEqual(
    resultAttributes([
      result("documentation"),
      result("documentation"),
      result("blog"),
    ]),
    {
      "search.result.count": 3,
      "search.result.documentation_count": 2,
      "search.result.api_reference_count": 0,
      "search.result.blog_count": 1,
    },
  )
})

test("records a provider status, message and request id", () => {
  const error = APIError.generate(
    503,
    { detail: "Service unavailable" },
    undefined,
    new Headers({ "x-request-id": "req_123" }),
  )

  assert.deepEqual(failureAttributes("provider", error, "layers"), {
    "search.failure.stage": "provider",
    "error.type": "503",
    "search.provider.status_code": 503,
    "search.failure.message": error.message,
    "search.provider.request_id": "req_123",
  })
})

test("removes the query from provider error messages", () => {
  const query = 'my "secret" project'
  const error = APIError.generate(
    422,
    { detail: [{ msg: "too long", input: query }] },
    undefined,
    new Headers(),
  )
  assert.include(error.message, JSON.stringify(query).slice(1, -1))

  const message = String(
    failureAttributes("provider", error, query)["search.failure.message"],
  )
  assert.notInclude(message, "secret")
  assert.include(message, "<query>")
})

test("leaves messages alone for queries too short to identify anyone", () => {
  const error = new APIConnectionError({ message: "Connection error." })
  assert.strictEqual(
    failureAttributes("provider", error, "on")["search.failure.message"],
    "Connection error.",
  )
})

test("names timeouts and connection failures", () => {
  assert.deepEqual(
    failureAttributes("provider", new APIConnectionTimeoutError(), "layers"),
    { "search.failure.stage": "provider", "error.type": "timeout" },
  )
  assert.strictEqual(
    failureAttributes(
      "provider",
      new APIConnectionError({ message: "Connection error." }),
      "layers",
    )["error.type"],
    "connection",
  )
})

test("records an unexpected response shape at the decode stage", () => {
  const exit = Effect.runSyncExit(
    Schema.decodeUnknownEffect(
      Schema.Struct({ data: Schema.Array(Schema.String) }),
    )({
      data: [1],
    }),
  )
  assert.isTrue(Exit.isFailure(exit))
  if (!Exit.isFailure(exit)) return
  const error = Cause.squash(exit.cause)

  const attributes = failureAttributes("response_decode", error, "layers")
  assert.strictEqual(attributes["search.failure.stage"], "response_decode")
  assert.strictEqual(attributes["error.type"], "SchemaError")
})
