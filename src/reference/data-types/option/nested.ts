import { Option } from "effect"

interface User {
  readonly id: number
  readonly username: string
  readonly email: Option.Option<string>
  readonly address: Option.Option<Address>
}

interface Address {
  readonly city: string
  readonly street: Option.Option<string>
}

const user: User = {
  id: 1,
  username: "john_doe",
  email: Option.some("john.doe@example.com"),
  address: Option.some({
    city: "New York",
    street: Option.some("123 Main St")
  })
}

// $ExpectType Option<string>
const street = user.address.pipe(Option.flatMap((address) => address.street))
