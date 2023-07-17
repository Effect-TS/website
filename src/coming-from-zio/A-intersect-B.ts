export interface A {
  readonly prop: string
}

export interface B {
  readonly prop: number
}

const ab: A & B = {
  // @ts-expect-error
  prop: "", // Type 'string' is not assignable to type 'never'.
}
