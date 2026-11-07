import { HiddenFiles } from "@website/domain"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"

export interface Overlay {
  readonly id: string
  readonly metadata: unknown
}

export interface SearchScope {
  readonly store_identifiers: Array<string>
  readonly file_ids?: ["not_in", Array<string>]
}

// A preview store changes only when a push syncs it. Failures are not kept, so
// the next search tries again.
export const cacheOverlay = <E>(
  retrieve: Effect.Effect<Overlay, E>,
): Effect.Effect<Effect.Effect<Option.Option<Overlay>, E>> =>
  retrieve.pipe(
    Effect.map(Option.some),
    Effect.cachedWithTTL((exit) => (Exit.isSuccess(exit) ? "30 seconds" : 0)),
  )

// A preview searches production and its own store, which holds only the files
// the pull request changed. Production files the pull request replaced or
// deleted are listed in the preview store's metadata and are left out.
export const searchScope = (options: {
  readonly production: string
  readonly overlay: Option.Option<Overlay>
}): SearchScope =>
  Option.match(options.overlay, {
    onNone: () => ({ store_identifiers: [options.production] }),
    onSome: ({ id, metadata }) => {
      const hidden = HiddenFiles.decode(metadata)
      return {
        store_identifiers: [options.production, id],
        ...(hidden.length === 0 ? {} : { file_ids: ["not_in", [...hidden]] }),
      }
    },
  })
