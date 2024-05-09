import { Effect } from "effect"
import { Service } from "./Service"

Effect.log("Welcome to Effect!")

Service.pipe(
  Effect.tap((service) => Effect.log(service.count)),
  Effect.provide(Service.Live),
  Effect.runPromise
)
