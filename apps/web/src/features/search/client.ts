import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import * as AtomHttpApi from "effect/reactivity/AtomHttpApi"
import { SearchApi } from "./api"

export class SearchClient extends AtomHttpApi.Service<SearchClient>()(
  "effect/website/SearchClient",
  {
    api: SearchApi,
    httpClient: FetchHttpClient.layer,
    transformClient: HttpClient.transform((effect, request) =>
      effect.pipe(
        Effect.timeout("5 seconds"),
        Effect.mapError((error) =>
          Cause.isTimeoutError(error)
            ? new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({
                  request,
                  cause: error,
                  description: "Search request timed out",
                }),
              })
            : error,
        ),
      ),
    ),
  },
) {}
