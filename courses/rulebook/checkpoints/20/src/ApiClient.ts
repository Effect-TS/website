import { Config, Context, Effect, Layer } from "effect"
import { HttpApiClient } from "effect/http-api"
import { Api } from "./api/Api.ts"

// A client derived from the same Api the server implements, so a request the
// server would not accept does not compile. It needs an HttpClient to send
// requests with: FetchHttpClient in the CLI, an in-memory one in tests.
export class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof Api>>()("rulebook/ApiClient") {
  static readonly layer = Layer.effect(
    ApiClient,
    Effect.gen(function*() {
      const baseUrl = yield* Config.String("RULEBOOK_URL").pipe(
        Config.withDefault("http://localhost:3000")
      )
      return yield* HttpApiClient.make(Api, { baseUrl })
    })
  )
}
