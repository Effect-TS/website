import * as Data from "effect/Data"
import type { DownloadsChart } from "@/features/npm-downloads/chart"

export class EnterpriseContentError extends Data.TaggedError(
  "EnterpriseContentError",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/** A team member the visitor can book a call with. Serialized into islands. */
export interface ContactMember {
  readonly id: string
  readonly name: string
  readonly title: string
  readonly avatar: string
  readonly timezone: string
  readonly scheduleUrl: string
}

/** Everything the enterprise page reads from the site's content. */
export interface EnterprisePage {
  readonly members: ReadonlyArray<ContactMember>
  /** Latest published `effect` version, without the `v`. */
  readonly currentVersion: string
  readonly downloads: DownloadsChart
}
