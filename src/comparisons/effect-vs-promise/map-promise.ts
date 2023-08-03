// $ExpectType Promise<number>
export const mapped = Promise.resolve("Hello").then((s) => s.length)
