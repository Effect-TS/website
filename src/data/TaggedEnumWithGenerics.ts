import { Data } from "effect"

type RemoteData<A, B> = Data.TaggedEnum<{
  Loading: {}
  Success: { data: A }
  Failure: { error: B }
}>

interface RemoteDataDefinition extends Data.TaggedEnum.WithGenerics<2> {
  readonly taggedEnum: RemoteData<this["A"], this["B"]>
}

const { Loading, Failure, Success } = Data.taggedEnum<RemoteDataDefinition>()

// $ExpectType Data<{ readonly _tag: "Loading"; }>
const loading = Loading()

// $ExpectType Data<{ readonly _tag: "Failure"; readonly error: string; }>
const failure = Failure({ error: "err" })

// $ExpectType Data<{ readonly _tag: "Success"; readonly data: number; }>
const success = Success({ data: 1 })
