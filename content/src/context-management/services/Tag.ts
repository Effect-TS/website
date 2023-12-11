import { Context } from "effect"

console.log(Context.Tag() === Context.Tag()) // Output: false

console.log(Context.Tag("PORT") === Context.Tag("PORT")) // Output: true
