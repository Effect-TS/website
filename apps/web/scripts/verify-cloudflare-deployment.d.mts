export function retry<A>(
  label: string,
  operation: (attempt: number) => Promise<A>,
  options?: {
    readonly timeoutMs?: number
    readonly delayMs?: number
  },
): Promise<A>

export function withCacheBuster(
  url: string | URL,
  nonce: string,
  attempt: number,
): URL
