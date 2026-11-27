/**
 * URL parameters Maple receives as `REDACTED`, from the browser and from the
 * Worker. `query` is what visitors type into search.
 */
export const REDACTED_URL_PARAMS: ReadonlyArray<string> = ["query"]

const REDACTED_PARAM = new RegExp(
  `([?&](?:${REDACTED_URL_PARAMS.join("|")})=)[^&#]*`,
  "g",
)

/** Replaces the value of each {@link REDACTED_URL_PARAMS} entry in `url`. */
export function redactUrl(url: string): string {
  return url.replace(REDACTED_PARAM, "$1REDACTED")
}
