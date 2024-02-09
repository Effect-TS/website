import { SubscriptionRef } from "effect"

// $ExpectType Effect<SubscriptionRef<number>, never, never>
const ref = SubscriptionRef.make(0)
