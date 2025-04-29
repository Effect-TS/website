import { Rx } from "@effect-rx/rx-react"
import * as Option from "effect/Option"

function getHash() {
  const hash = location.hash.slice(1)
  if (hash.length > 0) {
    return Option.some(hash)
  }
  return Option.none<string>()
}

export const hashRx = Rx.make<Option.Option<string>>((get) => {
  function onHashChange() {
    get.setSelf(getHash())
  }
  window.addEventListener("hashchange", onHashChange)
  get.addFinalizer(() => {
    window.removeEventListener("hashchange", onHashChange)
  })
  return getHash()
})
