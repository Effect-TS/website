```ts
interface User {
    readonly age: number
    readonly id: string
}

const byAge = Ord.contramap_(Ord.number, (_: User) => _.age);
const byId = Ord.contramap_(Ord.string, (_: User) => _.id);
const byAgeAndId = Ord.consecutive(byAge, byId);
```
