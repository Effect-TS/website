import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientError,
} from "effect/unstable/http"
import * as AtomHttpApi from "effect/unstable/reactivity/AtomHttpApi"
import { SearchApi } from "./contract"

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
