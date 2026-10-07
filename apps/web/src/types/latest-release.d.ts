declare module "virtual:latest-release" {
  import type { LatestRelease } from "@website/domain/Changelog"

  /** Latest release of `effect`; null when the build has no changelog data. */
  const release: LatestRelease | null

  export default release
}
