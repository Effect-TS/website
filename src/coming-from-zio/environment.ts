import { Effect } from "effect"

//                           v---------v---- `R` is a union of Console | Logger
type Http = Effect.Effect<Console | Logger, IOError | HttpError, Response>

type Response = Record<string, string>

interface IOError {
  readonly _tag: "IOError"
}

interface HttpError {
  readonly _tag: "HttpError"
}

interface Console {
  readonly log: (msg: string) => void
}

interface Logger {
  readonly log: (msg: string) => void
}
