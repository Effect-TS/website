import type { Loader } from "astro/loaders"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import { NpmDownloads } from "./service"

const runtime = ManagedRuntime.make(
  NpmDownloads.layer.pipe(Layer.provide(FetchHttpClient.layer)),
)

/**
 * One collection entry per complete week. Every build refetches. When npm is
 * unreachable the previous store is kept, and the build only fails when there
 * is no previous data.
 */
export const npmDownloadsLoader = (options: {
  readonly packageName: string
  readonly from: string
}): Loader => ({
  name: "npm-downloads-loader",
  load: async ({ generateDigest, logger, parseData, store }) => {
    const hasPrevious = store.keys().length > 0
    const weeks = await runtime.runPromise(
      Effect.gen(function* () {
        const npm = yield* NpmDownloads
        return yield* npm.weekly({ ...options, now: new Date() })
      }).pipe(
        Effect.map(Option.some),
        Effect.catchTag("NpmDownloadsError", (error) =>
          hasPrevious
            ? Effect.logWarning(
                `npm downloads unavailable, keeping the previous data: ${String(error.cause)}`,
              ).pipe(Effect.as(Option.none()))
            : Effect.fail(error),
        ),
      ),
    )
    if (Option.isNone(weeks)) return

    store.clear()
    for (const week of weeks.value) {
      const data = await parseData({
        id: week.weekStart,
        data: { packageName: options.packageName, ...week },
      })
      store.set({ id: week.weekStart, data, digest: generateDigest(data) })
    }
    logger.info(
      `Loaded ${weeks.value.length} weeks of ${options.packageName} downloads`,
    )
  },
})
