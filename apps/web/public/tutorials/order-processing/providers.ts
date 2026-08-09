import { Context, Effect, Layer, Ref, Schema } from "effect"

export class PaymentDeclined extends Schema.TaggedError<PaymentDeclined>()(
  "PaymentDeclined",
  {
    reason: Schema.String,
  },
) {}

export class ProviderUnavailable extends Schema.TaggedError<ProviderUnavailable>()(
  "ProviderUnavailable",
  {
    provider: Schema.String,
  },
) {}

export class InvalidDestination extends Schema.TaggedError<InvalidDestination>()(
  "InvalidDestination",
  {
    postalCode: Schema.String,
  },
) {}

export interface PaymentAuthorization {
  readonly authorizationId: string
  readonly provider: string
}

export class PaymentProvider extends Context.Service<
  PaymentProvider,
  {
    readonly authorize: (input: {
      readonly operationId: string
      readonly token: string
      readonly amountCents: number
    }) => Effect.Effect<
      PaymentAuthorization,
      PaymentDeclined | ProviderUnavailable
    >
    readonly void: (authorizationId: string) => Effect.Effect<void>
  }
>()("docs/PaymentProvider") {}

const paymentLayer = (provider: string, latency: number) =>
  Layer.effect(
    PaymentProvider,
    Effect.gen(function* () {
      const attempts = yield* Ref.make(new Map<string, number>())

      const authorize = Effect.fnUntraced(function* (input: {
        readonly operationId: string
        readonly token: string
        readonly amountCents: number
      }) {
        const attempt = yield* Ref.modify(attempts, (current) => {
          const next = (current.get(input.operationId) ?? 0) + 1
          const updated = new Map(current)
          updated.set(input.operationId, next)
          return [next, updated] as const
        })

        yield* Effect.log(`${provider} authorization attempt ${attempt}`)

        if (input.token === "tok_declined") {
          return yield* new PaymentDeclined({ reason: "card declined" })
        }
        if (input.token === "tok_flaky" && attempt < 3) {
          return yield* new ProviderUnavailable({ provider })
        }

        yield* Effect.sleep(input.token === "tok_slow" ? 2_000 : latency)
        yield* Ref.update(attempts, (current) => {
          const updated = new Map(current)
          updated.delete(input.operationId)
          return updated
        })

        return {
          authorizationId: `${provider}-${input.operationId}`,
          provider,
        }
      })

      const voidAuthorization = Effect.fnUntraced(function* (
        authorizationId: string,
      ) {
        yield* Effect.sleep("20 millis")
        yield* Effect.log(`voided ${authorizationId}`)
      })

      return PaymentProvider.of({ authorize, void: voidAuthorization })
    }),
  )

export const PaymentProviderFixture = paymentLayer("primary-pay", 80)
export const BackupPaymentProviderFixture = paymentLayer("backup-pay", 40)

export class ShippingProvider extends Context.Service<
  ShippingProvider,
  {
    readonly quote: (input: {
      readonly postalCode: string
      readonly itemCount: number
    }) => Effect.Effect<number, InvalidDestination | ProviderUnavailable>
  }
>()("docs/ShippingProvider") {}

export const ShippingProviderFixture = Layer.succeed(
  ShippingProvider,
  ShippingProvider.of({
    quote: Effect.fnUntraced(function* (input) {
      if (input.postalCode === "INVALID") {
        return yield* new InvalidDestination({
          postalCode: input.postalCode,
        })
      }
      if (input.postalCode === "OUTAGE") {
        return yield* new ProviderUnavailable({ provider: "fixture-ship" })
      }

      yield* Effect.sleep(
        input.postalCode === "SLOW" ? "2 seconds" : "120 millis",
      )
      return 500 + input.itemCount * 50
    }),
  }),
)
