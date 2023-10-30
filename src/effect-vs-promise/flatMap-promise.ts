// $ExpectType Promise<number>
export const flatMapped = Promise.resolve("Hello").then((s) =>
  Promise.resolve(s.length)
)
