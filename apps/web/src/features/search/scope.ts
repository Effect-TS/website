import { HiddenFiles } from "@website/domain"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

export interface SearchScope {
  readonly store_identifiers: Array<string>
  readonly file_ids?: ["not_in", Array<string>]
}

export const productionScope = (production: string): SearchScope => ({
  store_identifiers: [production],
})

// A preview searches production and its own store, which holds only the files
// the pull request changed. Production files the pull request replaced or
// deleted are listed in the preview store's metadata and are left out.
export const previewScope = (
  production: string,
  preview: { readonly id: string; readonly metadata: unknown },
): SearchScope => {
  const hidden = HiddenFiles.decode(preview.metadata)
  return {
    store_identifiers: [production, preview.id],
    ...(hidden.length === 0 ? {} : { file_ids: ["not_in", [...hidden]] }),
  }
}

// A preview store changes only when a push syncs it. Failures are not kept, so
// the next search tries again.
export const cacheScope = <E>(
  retrieve: Effect.Effect<SearchScope, E>,
): Effect.Effect<Effect.Effect<SearchScope, E>> =>
  retrieve.pipe(
    Effect.cachedWithTTL((exit) => (Exit.isSuccess(exit) ? "30 seconds" : 0)),
  )
