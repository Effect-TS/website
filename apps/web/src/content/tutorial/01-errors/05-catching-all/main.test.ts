import { Effect } from "effect"
import { assert, it } from "tutorial-test"
import { handlePayment } from "./main"

type ErrorOf<T> =
  T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

const respond = async (token: Parameters<typeof handlePayment>[0]) => {
  const response = await Effect.runPromise(handlePayment(token)).catch(() => {
    throw new Error(`${token} still fails. Handle its error`)
  })
  return `${response.status} ${await response.text()}`
}

it("an expired card becomes 402", async () =>
  assert.strictEqual(await respond("tok_expiredcard"), "402 Card expired"))

it("an invalid token becomes 400", async () =>
  assert.strictEqual(await respond("tok_invalid"), "400 Invalid payment token"))

it("a timeout becomes 503", async () =>
  assert.strictEqual(
    await respond("tok_timeout"),
    "503 Payment provider unavailable",
  ))

it("a successful payment still returns 200", async () =>
  assert.strictEqual((await respond("tok_authorized")).slice(0, 3), "200"))

it("no expected errors are left in the type", () => {
  const exact: Equal<ErrorOf<ReturnType<typeof handlePayment>>, never> = true
  void exact
})
