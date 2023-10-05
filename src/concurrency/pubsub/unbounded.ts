import { PubSub } from "effect"

const unboundedPubSub = PubSub.unbounded<string>()
