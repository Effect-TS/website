import { assert, test } from "vite-plus/test"
import {
  detectTrafficMode,
  validateTrafficTransition,
} from "../../scripts/validate-cloudflare-traffic-transition.mjs"

const domainOwners = (...entries: ReadonlyArray<readonly [string, string]>) =>
  new Map(entries)

test("detects each supported traffic mode", () => {
  assert.equal(
    detectTrafficMode({ routeOwner: undefined, domainOwners: domainOwners() }),
    "workers-dev",
  )
  assert.equal(
    detectTrafficMode({
      routeOwner: "website",
      domainOwners: domainOwners(),
    }),
    "routes",
  )
  assert.equal(
    detectTrafficMode({
      routeOwner: "website",
      domainOwners: domainOwners(
        ["effect.website", "website"],
        ["www.effect.website", "website"],
      ),
    }),
    "bridge",
  )
  assert.equal(
    detectTrafficMode({
      routeOwner: undefined,
      domainOwners: domainOwners(
        ["effect.website", "website"],
        ["www.effect.website", "website"],
      ),
    }),
    "custom-domains",
  )
})

test("rejects inconsistent live traffic ownership", () => {
  assert.throws(() =>
    detectTrafficMode({
      routeOwner: undefined,
      domainOwners: domainOwners(["effect.website", "website"]),
    }),
  )
  assert.throws(() =>
    detectTrafficMode({
      routeOwner: "other-worker",
      domainOwners: domainOwners(
        ["effect.website", "website"],
        ["www.effect.website", "website"],
      ),
    }),
  )
  assert.throws(() =>
    detectTrafficMode({
      routeOwner: undefined,
      domainOwners: domainOwners(
        ["effect.website", "website"],
        ["www.effect.website", "other-worker"],
      ),
    }),
  )
})

test("rejects automated transitions that detach Custom Domains", () => {
  assert.throws(() => validateTrafficTransition("bridge", "routes"))
  assert.throws(() => validateTrafficTransition("bridge", "workers-dev"))
  assert.throws(() => validateTrafficTransition("custom-domains", "routes"))
  assert.throws(() =>
    validateTrafficTransition("custom-domains", "workers-dev"),
  )
})

test("allows transitions that preserve or add public traffic ownership", () => {
  assert.doesNotThrow(() => validateTrafficTransition("workers-dev", "routes"))
  assert.doesNotThrow(() => validateTrafficTransition("routes", "bridge"))
  assert.doesNotThrow(() =>
    validateTrafficTransition("custom-domains", "bridge"),
  )
  assert.doesNotThrow(() =>
    validateTrafficTransition("bridge", "custom-domains"),
  )
  assert.doesNotThrow(() =>
    validateTrafficTransition("custom-domains", "custom-domains"),
  )
})
