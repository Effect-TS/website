import { Context, Effect, Exit, Latch, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"

// How the fake server answers every request: never (until interrupted), with
// a status and a JSON body, or by dying as a planted bug would.
export type Reply =
  | { readonly _tag: "Hang" }
  | { readonly _tag: "Respond"; readonly status: number; readonly body: unknown }
  | { readonly _tag: "Die"; readonly message: string }

// What a test can see of the fake server. `arrived` opens when a request
// arrives, `requests` holds the URL of each request in order, and `released`
// becomes true when a hanging request is interrupted.
export class Remote extends Context.Service<Remote, {
  readonly arrived: Latch.Latch
  readonly requests: Array<string>
  released: boolean
}>()("test/Remote") {}

// An HttpClient that never opens a socket, together with the Remote that
// records what it was asked.
export const layer = (reply: Reply) =>
  Layer.effectContext(Effect.gen(function*() {
    const remote = Remote.of({ arrived: yield* Latch.make(), requests: [], released: false })
    const client = HttpClient.make((request) =>
      Effect.gen(function*() {
        remote.requests.push(request.url)
        yield* remote.arrived.open
        switch (reply._tag) {
          case "Hang":
            return yield* Effect.never.pipe(Effect.onInterrupt(() => Effect.sync(() => remote.released = true)))
          case "Respond":
            return HttpClientResponse.fromWeb(
              request,
              new Response(JSON.stringify(reply.body), {
                status: reply.status,
                headers: { "content-type": "application/json" }
              })
            )
          case "Die":
            return yield* Effect.die(new Error(reply.message))
        }
      })
    )
    return Context.make(Remote, remote).pipe(Context.add(HttpClient.HttpClient, client))
  }))

// Runs `check` until it succeeds, letting other fibers run in between: work
// the loop does in the background is awaited without sleeping.
export const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
  Effect.gen(function*() {
    for (let attempt = 1;; attempt++) {
      const exit = yield* Effect.exit(check)
      if (Exit.isSuccess(exit) || attempt === 100) return yield* exit
      yield* Effect.yieldNow
    }
  })
