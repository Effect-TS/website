import { HiddenFiles } from "@website/domain"

export interface SearchScope {
  readonly store_identifiers: Array<string>
  readonly file_ids?: ["not_in", Array<string>]
}

// A preview searches production and its own store, which holds only the files
// the pull request changed. Production files the pull request replaced or
// deleted are listed in the preview store's metadata and are left out.
export const searchScope = (options: {
  readonly production: string
  readonly overlay?: {
    readonly id: string
    readonly metadata: unknown
  }
}): SearchScope => {
  if (options.overlay === undefined) {
    return { store_identifiers: [options.production] }
  }
  const hidden = HiddenFiles.decode(options.overlay.metadata)
  return {
    store_identifiers: [options.production, options.overlay.id],
    ...(hidden.length === 0 ? {} : { file_ids: ["not_in", [...hidden]] }),
  }
}
