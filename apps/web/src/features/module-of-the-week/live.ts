import * as Layer from "effect/Layer"
import * as AstroContent from "./astro-content"
import { Modules } from "./service"

/** `Modules` reading from Astro content collections. */
export const layer = Modules.layer.pipe(Layer.provide(AstroContent.layer))
