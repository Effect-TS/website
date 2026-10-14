declare module "virtual:latest-release" {
  /** Latest release of `effect`; null when the build has no changelog data. */
  const release: {
    readonly name: string
    readonly version: string
    readonly date?: string
  } | null

  export default release
}
