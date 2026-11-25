import { Data, Effect } from "effect"

export interface Authorization {
  readonly id: string
  readonly status: "authorized" | "declined"
}

export class DoubleCaptureError extends Data.TaggedError("DoubleCaptureError")<{
  readonly id: string
}> {}

const captured = new Set<string>()

export const capturePayment = Effect.fn(function* (
  authorization: Authorization,
) {
  captured.add(authorization.id)

  return authorization
})
