import { PubSub } from "effect"

const boundedPubSub = PubSub.bounded<string>(2)
