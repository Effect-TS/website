const increment = (x: number) => x + 1

const divide = (a: number, b: number): Promise<number> =>
  b === 0
    ? Promise.reject(new Error("Cannot divide by zero"))
    : Promise.resolve(a / b)

// () => Promise<string>
export const program = async function () {
  const [a, b] = await Promise.all([Promise.resolve(10), Promise.resolve(2)])
  const n1 = await divide(a, b)
  const n2 = increment(n1)
  return `Result is: ${n2}`
}

program().then(console.log) // Output: "Result is: 6"
