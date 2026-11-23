const here = (): string => new Error().stack!.split("\n")[2]!.trim()
// line 2
console.log("a0 expect line 3:", here())
