import { SubscriptionRef } from "effect"

// $ExpectType Effect<never, never, SubscriptionRef<number>>
const ref = SubscriptionRef.make(0)
