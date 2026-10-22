import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as AtomHttpApi from "effect/reactivity/AtomHttpApi"
import { MotwVoteApi } from "./api"

export class MotwVoteClient extends AtomHttpApi.Service<MotwVoteClient>()(
  "app/MotwVoteClient",
  { api: MotwVoteApi, httpClient: FetchHttpClient.layer },
) {}
