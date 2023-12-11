import { Chunk, Option } from "effect"

export interface TypeLambda {
  readonly Target: unknown
}

export interface ArrayTypeLambda extends TypeLambda {
  readonly type: Array<this["Target"]>
}

export type Kind<F extends TypeLambda, Target> = F extends {
  readonly type: unknown
}
  ? // If F has a type property, it means it is a concrete type lambda (e.g., F = ArrayTypeLambda).
    // The intersection allows us to obtain the result of applying F to Target.
    (F & {
      readonly Target: Target
    })["type"]
  : // If F is generic, we must explicitly specify all of its type parameters
    // to ensure that none are omitted from type checking.
    {
      readonly F: F
      readonly Target: (_: Target) => Target // This enforces invariance.
    }

// $ExpectType string[]
type Test1 = Kind<ArrayTypeLambda, string> // Applying ArrayTypeLambda to string

// $ExpectType number[]
type Test2 = Kind<ArrayTypeLambda, number> // Applying ArrayTypeLambda to number

export interface ChunkTypeLambda extends TypeLambda {
  readonly type: Chunk.Chunk<this["Target"]>
}

export interface OptionTypeLambda extends TypeLambda {
  readonly type: Option.Option<this["Target"]>
}

// $ExpectType Chunk<string>
type Test3 = Kind<ChunkTypeLambda, string>

// $ExpectType Option<string>
type Test4 = Kind<OptionTypeLambda, string>

export interface Mappable<F extends TypeLambda> {
  readonly map: <A, B>(self: Kind<F, A>, f: (a: A) => B) => Kind<F, B>
}

export const MappableArray: Mappable<ArrayTypeLambda> = {
  map: (self, f) => self.map(f)
}

export const MappableChunk: Mappable<ChunkTypeLambda> = {
  map: Chunk.map
}

export const MappableOption: Mappable<OptionTypeLambda> = {
  map: Option.map
}

export const stringify =
  <F extends TypeLambda>(TC: Mappable<F>) =>
  (self: Kind<F, number>): Kind<F, string> =>
    TC.map(self, (n) => `number: ${n}`)

// $ExpectType string[]
const arrayTest = stringify(MappableArray)([1, 2, 3])
console.log(arrayTest)
// [ 'number: 1', 'number: 2', 'number: 3' ]

// $ExpectType Chunk<string>
const chunkTest = stringify(MappableChunk)(Chunk.fromIterable([1, 2, 3]))
console.log(chunkTest)
// { _id: 'Chunk', values: [ 'number: 1', 'number: 2', 'number: 3' ] }

// $ExpectType Option<string>
const optionTest = stringify(MappableOption)(Option.some(1))
console.log(optionTest)
// { _id: 'Option', _tag: 'Some', value: 'number: 1' }
