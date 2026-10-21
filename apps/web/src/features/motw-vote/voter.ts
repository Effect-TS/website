const encoder = new TextEncoder()

const COOKIE = "motw_voter"
const COOKIE_PATH = "/api/motw-vote"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The voter of a request that carries no valid cookie. It never holds a vote. */
export const NIL_VOTER = "00000000-0000-4000-8000-000000000000"

const hmacKey = (secret: string, usage: "sign" | "verify") =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  )

const toBase64Url = (bytes: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")

const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> => {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/")
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** A new voter and its cookie value: the id and a signature only the server can make. */
export const issueVoter = async (secret: string) => {
  const voter = crypto.randomUUID()
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret, "sign"),
    encoder.encode(voter),
  )
  return { voter, token: `${voter}.${toBase64Url(signature)}` }
}

/** The voter a cookie value names, or `undefined` if it was not issued with this secret. */
export const verifyVoter = async (
  secret: string,
  token: string,
): Promise<string | undefined> => {
  const [voter, signature, ...rest] = token.split(".")
  if (!voter || !signature || rest.length > 0 || !UUID.test(voter))
    return undefined
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret, "verify"),
      fromBase64Url(signature),
      encoder.encode(voter),
    )
    return valid ? voter : undefined
  } catch {
    return undefined
  }
}

const cookieValue = (header: string | null): string | undefined =>
  header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)

export interface Identity {
  /** The verified voter, or `undefined` if the request has no valid cookie. */
  readonly voter: string | undefined
  /** The request had a cookie that was not issued by this server. */
  readonly tampered: boolean
}

export const identify = async (
  request: Request,
  secret: string,
): Promise<Identity> => {
  const token = cookieValue(request.headers.get("cookie"))
  if (token === undefined) return { voter: undefined, tampered: false }
  const voter = await verifyVoter(secret, token)
  return { voter, tampered: voter === undefined }
}

const attributes = (secure: boolean) =>
  `Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`

export const voterCookie = (token: string, secure: boolean): string =>
  `${COOKIE}=${token}; Max-Age=31536000; ${attributes(secure)}`

export const clearedVoterCookie = (secure: boolean): string =>
  `${COOKIE}=; Max-Age=0; ${attributes(secure)}`
