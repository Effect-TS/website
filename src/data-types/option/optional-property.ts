import { Option } from "effect"

interface User {
  readonly id: number
  readonly username: string
  readonly email: Option.Option<string>
}

const withEmail: User = {
  id: 1,
  username: "john_doe",
  email: Option.some("john.doe@example.com"),
}

const withoutEmail: User = {
  id: 2,
  username: "jane_doe",
  email: Option.none(),
}
