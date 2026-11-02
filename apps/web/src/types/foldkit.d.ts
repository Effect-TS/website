declare module "virtual:foldkit/build-id" {
  /** Names the build. The server stamps it on the HTML, the client compares it. */
  const buildId: string
  export default buildId
}
