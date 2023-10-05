import { PubSub } from "effect"

const droppingPubSub = PubSub.dropping<string>(2)
