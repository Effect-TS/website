import { Effect } from "effect"
import assert from "assert"

// Simulated asynchronous task to fetch a transaction amount from a database
const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))

// Simulated asynchronous task to fetch a discount rate from a configuration file
const fetchDiscountRate = Effect.promise(() => Promise.resolve(5))

const program = Effect.gen(function* () {
  const transactionAmount = yield* fetchTransactionAmount

  const discountRate = yield* fetchDiscountRate

  const discountedAmount = yield* applyDiscount(
    transactionAmount,
    discountRate
  )

  return addServiceCharge(discountedAmount)
})

Effect.runPromise(program).then((value) => {
  assert.strictEqual(value, 96)
})

// Helper Methods

/**
 * Adds a small service charge to a transaction amount.
 */
function addServiceCharge(amount: number): number {
  return amount + 1
}

/**
 * Applies a discount safely to a transaction amount.
 */
function applyDiscount(
  total: number,
  discountRate: number
): Effect.Effect<number, Error> {
  return discountRate === 0
    ? Effect.fail(new Error("Discount rate cannot be zero"))
    : Effect.succeed(total - (total * discountRate) / 100)
}
