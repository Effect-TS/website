import { Brand } from "effect"

type Int = number & Brand.Brand<"Int">

const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

type Positive = number & Brand.Brand<"Positive">

const Positive = Brand.refined<Positive>(
  (n) => n > 0,
  (n) => Brand.error(`Expected ${n} to be positive`)
)

// Combine the Int and Positive branded types into a new branded type PositiveInt
const PositiveInt = Brand.all(Int, Positive)

// Extract the branded type from the PositiveInt constructor
type PositiveInt = Brand.Brand.FromConstructor<typeof PositiveInt>

// Usage example
const value1: PositiveInt = PositiveInt(10) // Valid positive integer
const value2: PositiveInt = PositiveInt(-5) // Throws an error: [ { message: 'Expected -5 to be positive' } ]
const value3: PositiveInt = PositiveInt(3.14) // Throws an error: [ { message: 'Expected 3.14 to be an integer' } ]
