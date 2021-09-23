## Comparing Effect with PureScript

### Pros / Cons Effect

#### Pros
- Large non-EffectTS ecosystem which can be easily wrapped
- Maybe more management buy-in as TS does not sound exotic and EffectTS just sounds like a library?
- Fast compiler (ESBuild or SWC)

#### Neutral
- Performance in between PS and impure TS
- Impure escape hatch always available, relies on discipline
- takes a few weeks to train an average TS developers to use it and at the moment the ones who have spent a bit of time with it don't want to go back (even when with OOP background)
- the syntax is in average not verbose unless you are declaring primarily typeclasses (using is not verbose) but the reason is that the typeclasses are expressed over a single Kind14 (* -> * -> * ... 14 times)

#### Cons
- there is a lot of hardcore FP talent in ZIO and a good degree in effect, FP does NOT mean TypeClasses over a HM type-system it mean programming with pure functions
- Fast compilers like SWC or ESBuild don't support plugins so features like the fluent api or execution tracing can't be used

### Pros / Cons PureScript

#### Pros
- Syntax and Currying
- Type System Features
- Purity built into type system (writing impure code is hard)
- Immutable data structures by default
- Lots of Talent that would like to use Haskell or PureScript on their day job

#### Cons
- FFI a bit clunky
- Sometimes a bit verbose as not all instances can be derived
- Performance
- Lack of good backend libraries and general lack of community interest to support backend (most PureScripters want Haskell for the frontend not another Haskell for the backend)
- Sometimes writing stack-safe code or high performant, intentionally mutable code is hard
- When depending on NPM dependencies (which you usually do), you need two package managers
