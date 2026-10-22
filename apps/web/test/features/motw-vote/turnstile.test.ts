import { assert, describe, test } from "vite-plus/test"
import * as Cause from "effect/Cause"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { TestClock } from "effect/testing"
import { inspect } from "node:util"
import {
  SITEVERIFY,
  Turnstile,
} from "../../../src/features/motw-vote/turnstile.ts"

const SECRET = "very-secret-value"

const config = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET: SECRET,
  }),
)

const decoder = new TextDecoder()

const formOf = (request: HttpClientRequest.HttpClientRequest) =>
  request.body._tag === "Uint8Array"
    ? new URLSearchParams(decoder.decode(request.body.body))
    : new URLSearchParams()

const fake = (
  respond: (request: HttpClientRequest.HttpClientRequest) => Response,
) => {
  const seen: Array<HttpClientRequest.HttpClientRequest> = []
  const client = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      seen.push(request)
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, respond(request)),
      )
    }),
  )
  return { seen, layer: Layer.provide(Turnstile.layer, [client, config]) }
}

const verify = (token: string) =>
  Turnstile.use((turnstile) => turnstile.verify(token))

const defect = <A, R>(effect: Effect.Effect<A, never, R>) =>
  Effect.map(Effect.exit(effect), (exit) => {
    assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause))
    return exit
  })

describe("Turnstile", () => {
  test("a solved check verifies, an unsolved one does not", async () => {
    const solved = fake(() => Response.json({ success: true }))
    const unsolved = fake(() =>
      Response.json({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    )
    assert.equal(
      await Effect.runPromise(verify("t").pipe(Effect.provide(solved.layer))),
      true,
    )
    assert.equal(
      await Effect.runPromise(verify("t").pipe(Effect.provide(unsolved.layer))),
      false,
    )
  })

  test("the site key comes from config", async () => {
    const { layer } = fake(() => Response.json({ success: true }))
    const siteKey = await Effect.runPromise(
      Turnstile.use((turnstile) => Effect.succeed(turnstile.siteKey)).pipe(
        Effect.provide(layer),
      ),
    )
    assert.equal(siteKey, "site-key")
  })

  test("posts the secret and the token as a form to siteverify", async () => {
    const { seen, layer } = fake(() => Response.json({ success: true }))
    await Effect.runPromise(verify("the-token").pipe(Effect.provide(layer)))
    assert.equal(seen.length, 1)
    const [request] = seen
    assert.equal(request.method, "POST")
    assert.equal(request.url, SITEVERIFY)
    assert.equal(
      request.headers["content-type"],
      "application/x-www-form-urlencoded",
    )
    assert.deepEqual(Object.fromEntries(formOf(request)), {
      secret: SECRET,
      response: "the-token",
    })
  })

  test("an answer that is not 2xx is a defect, and does not leak the secret", async () => {
    const { layer } = fake(() => new Response("down", { status: 503 }))
    const exit = await Effect.runPromise(
      defect(verify("t")).pipe(Effect.provide(layer)),
    )
    assert.notInclude(String(exit), SECRET)
    assert.notInclude(inspect(exit, { depth: 10 }), SECRET)
    assert.notInclude(JSON.stringify(exit), SECRET)
  })

  test("an answer that is not the expected JSON is a defect", async () => {
    for (const body of [
      new Response("<html>oops</html>"),
      Response.json({ ok: true }),
      Response.json({ success: "yes" }),
    ]) {
      const { layer } = fake(() => body)
      await Effect.runPromise(defect(verify("t")).pipe(Effect.provide(layer)))
    }
  })

  test("a request that takes more than 5 seconds is a defect", async () => {
    const never = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.never),
    )
    await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(defect(verify("t")))
        yield* TestClock.adjust("4 seconds")
        assert.isUndefined(fiber.pollUnsafe())
        yield* TestClock.adjust("2 seconds")
        return yield* Fiber.join(fiber)
      }).pipe(
        Effect.provide(Layer.provide(Turnstile.layer, [never, config])),
        Effect.provide(TestClock.layer()),
      ),
    )
  })
})
