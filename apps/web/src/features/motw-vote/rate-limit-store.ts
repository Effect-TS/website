import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RateLimiter from "effect/persistence/RateLimiter"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import * as SqlSchema from "effect/sql/SqlSchema"

const storeError = (message: string) =>
  new RateLimiter.RateLimiterError({
    reason: new RateLimiter.RateLimitStoreError({ message }),
  })

const unsupported = (operation: string) =>
  Effect.fail(storeError(`${operation} is not supported by the SQL store`))

/**
 * A fixed-window `RateLimiterStore` on SQL, so limits hold across Worker
 * isolates. Same counting as `layerStoreMemory`: each token pushes the window
 * end by one refill interval. Rejected tokens are counted too but do not move
 * the window end. Token buckets are not supported and fail with
 * `RateLimitStoreError`. Adaptive limiting is always inactive.
 * Expired rows are overwritten on next use and never deleted.
 */
export const layer: Layer.Layer<
  RateLimiter.RateLimiterStore,
  never,
  SqlClient.SqlClient
> = Layer.effect(
  RateLimiter.RateLimiterStore,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const consume = SqlSchema.findOne({
      Request: Schema.Struct({
        key: Schema.String,
        tokens: Schema.Number,
        increment: Schema.Number,
        limit: Schema.NullOr(Schema.Number),
        now: Schema.Number,
      }),
      Result: Schema.Struct({ count: Schema.Number, ttl: Schema.Number }),
      execute: ({ key, tokens, increment, limit, now }) => sql`
        INSERT INTO rate_limits (key, count, expires_at)
        VALUES (${key}, ${tokens}, ${now + increment})
        ON CONFLICT (key) DO UPDATE SET
          count = CASE
            WHEN expires_at <= ${now} THEN ${tokens}
            ELSE count + ${tokens}
          END,
          expires_at = CASE
            WHEN expires_at <= ${now} THEN ${now + increment}
            WHEN ${limit} IS NULL OR count + ${tokens} <= ${limit}
              THEN expires_at + ${increment}
            ELSE expires_at
          END
        RETURNING count, expires_at - ${now} AS ttl`,
    })

    const fixedWindow = Effect.fn("RateLimiterStore.sql.fixedWindow")(
      function* (options: {
        readonly key: string
        readonly tokens: number
        readonly refillRate: Duration.Duration
        readonly limit: number | undefined
      }) {
        const now = yield* Clock.currentTimeMillis
        const { count, ttl } = yield* consume({
          key: options.key,
          tokens: options.tokens,
          increment: Math.max(
            1,
            Math.ceil(Duration.toMillis(options.refillRate) * options.tokens),
          ),
          limit: options.limit ?? null,
          now,
        })
        return [count, ttl] as const
      },
      Effect.mapError(
        (cause) =>
          new RateLimiter.RateLimiterError({
            reason: new RateLimiter.RateLimitStoreError({
              message: "Failed to execute fixedWindow rate limiting statement",
              cause,
            }),
          }),
      ),
    )

    return RateLimiter.RateLimiterStore.of({
      fixedWindow,
      tokenBucket: () => unsupported("tokenBucket"),
      adaptiveConsume: () =>
        Effect.succeed({
          delay: Duration.zero,
          epoch: 0,
          phase: "inactive",
        }),
      adaptiveFeedback: () => Effect.void,
    })
  }),
)
