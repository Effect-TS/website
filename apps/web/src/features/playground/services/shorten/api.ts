import * as Schema from "effect/Schema"
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { ShortenError } from "./domain"

export class ShortenApiGroup extends HttpApiGroup.make("shorten", {
  topLevel: true,
}).add(
  HttpApiEndpoint.post("shorten", "/api/playground/shorten", {
    payload: Schema.Struct({ text: Schema.String }),
    error: ShortenError,
    success: Schema.String,
  }),
  HttpApiEndpoint.get("retrieve", "/api/playground/shorten/:hash", {
    params: { hash: Schema.String },
    error: ShortenError,
    success: Schema.Option(Schema.String),
  }),
) {}

export class ShortenApi extends HttpApi.make("shortenApi").add(
  ShortenApiGroup,
) {}
