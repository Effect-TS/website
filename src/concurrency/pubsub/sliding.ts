import { PubSub } from "effect"

const slidingPubSub = PubSub.sliding<string>(2)
