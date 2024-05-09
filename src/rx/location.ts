import { Rx } from "@effect-rx/rx-react"
import { Option } from "effect"

function getHash() {
  const hash = location.hash.slice(1)
  if (hash) return Option.some(hash)
  return Option.none<string>()
}

export const hashRx = Rx.make<Option.Option<string>>((get) => {
  function onHashChange() {
    get.setSelfSync(getHash())
  }
  window.addEventListener("hashchange", onHashChange)
  get.addFinalizer(() => {
    window.removeEventListener("hashchange", onHashChange)
  })
  return getHash()
})
