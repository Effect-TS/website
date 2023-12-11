export interface A {
  readonly prop: string
}

export interface B {
  readonly prop: number
}

const ab: A | B = {
  prop: ""
}
