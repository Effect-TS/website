export type TrafficMode = "workers-dev" | "routes" | "bridge" | "custom-domains"

export function detectTrafficMode(options: {
  readonly routeOwner: string | undefined
  readonly domainOwners: ReadonlyMap<string, string>
}): TrafficMode

export function validateTrafficTransition(
  currentMode: TrafficMode,
  targetMode: TrafficMode,
): void
