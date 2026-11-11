import * as Predicate from "effect/Predicate"
import {
  type LocalFileIdentity,
  type RemoteFileIdentity,
  reconcileApiReferenceFiles,
} from "./ApiReferenceSync.ts"

export interface ProductionFile extends RemoteFileIdentity {
  readonly id: string
}

export interface OverlayPlan<L extends LocalFileIdentity> {
  readonly upload: ReadonlyArray<L>
  readonly hidden: ReadonlyArray<string>
}

// A preview store holds only what differs from production. Production files
// that the pull request replaces or deletes are hidden at search time.
export function planOverlay<L extends LocalFileIdentity>(
  local: ReadonlyArray<L>,
  production: ReadonlyArray<ProductionFile>,
  version: number,
): OverlayPlan<L> {
  const { changedFiles, staleFiles } = reconcileApiReferenceFiles(
    local,
    production,
    version,
  )
  const replaced = new Set(changedFiles.map((file) => file.externalId))
  const stale = new Set(staleFiles)
  return {
    upload: changedFiles,
    hidden: production
      .filter(
        (file) =>
          stale.has(file) ||
          (Predicate.isNotNullish(file.external_id) &&
            replaced.has(file.external_id)),
      )
      .map((file) => file.id),
  }
}
