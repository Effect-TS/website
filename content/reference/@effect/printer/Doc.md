## Doc

Reference Documentation for the module '@effect/printer/Doc'

The abstract data type `Doc` represents prettified documents that have been
annotated with data of type `A`.

More specifically, a value of type `Doc` represents a non-empty set of
possible layouts for a given document. The layout algorithms select one of
these possibilities, taking into account variables such as the width of the
document.

The annotation is an arbitrary piece of data associated with (part of) a
document. Annotations may be used by rendering algorithms to display
documents differently by providing information such as:
- color information (e.g., when rendering to the terminal)
- mouseover text (e.g., when rendering to rich HTML)
- whether to show something or not (to allow simple or detailed versions)

```ts
export type Doc<A> = Fail<A> | Empty<A> | Char<A> | Text<A> | Line<A> | FlatAlt<A> | Cat<A> | Nest<A> | Union<A> | Column<A> | WithPageWidth<A> | Nesting<A> | Annotated<A>;
```

## General API

### align

The `align` combinator lays out a document with the nesting level set to the
current column.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

// As an example, the documents below will be placed one above the other
// regardless of the current nesting level

// Without `align`ment, the second line is simply placed below everything
// that has been laid out so far
const unaligned = D.hsep([
  D.text('lorem'),
  D.vsep([D.text('ipsum'), D.text('dolor')])
])

console.log(R.renderPrettyDefault(unaligned))
// lorem ipsum
// dolor

// With `align`ment, the `vsep`ed documents all start at the same column
const aligned = D.hsep([
  D.text('lorem'),
  D.align(D.vsep([D.text('ipsum'), D.text('dolor')]))
])

console.log(R.renderPrettyDefault(aligned))
// lorem ipsum
//       dolor
```

```ts
export declare const align: <A>(self: Doc<A>) => Doc<A>;
```

### alterAnnotations

Change the annotations of a document. Individual annotations can be removed,
changed, or replaced by multiple ones.

This is a general function that combines `unAnnotate` and `reAnnotate`, and
is useful for mapping semantic annotations (such as »this is a keyword«) to
display annotations (such as »this is red and underlined«) because some
backends may not care about certain annotations while others may.

Annotations earlier in the new list will be applied earlier, so returning
`[Bold, Green]` will result in a bold document that contains green text, and
not vice versa.

Since this traverses the entire document tree, including the parts that are
not rendered (due to other layouts having better fit), it is preferable to
reannotate a document **after** producing the layout by using
`alterAnnotations` from the `SimpleDocStream` module.

```ts
export declare const alterAnnotations: <A, B>(f: (a: A) => Collection<B>) => (self: Doc<A>) => Doc<B>;
```

### angled

Encloses the input document in angle brackets (`<>`).

```ts
export declare const angled: <A>(self: Doc<A>) => Doc<A>;
```

### annotate

Adds an annotation to a `Doc`. The annotation can then be used by the rendering
algorithm to, for example, add color to certain parts of the output.

**Note** This function is relevant only for custom formats with their own annotations,
and is not relevant for basic pretty printing.

```ts
export declare const annotate: <A>(annotation: A) => <B>(doc: Doc<B>) => Doc<A | B>;
```

### appendWithLine

The `appendWithLine` combinator concatenates two documents by placing a
`line` document between them.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.appendWithLine_(D.char('a'), D.char('b'))

console.log(R.renderPrettyDefault(doc))
// a
// b
```

```ts
export declare const appendWithLine: <A>(that: Doc<A>) => (self: Doc<A>) => Doc<A>;
```

### appendWithLineBreak

The `appendWithLineBreak` combinator concatenates two documents by placing a
`lineBreak` document between them.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.appendWithLineBreak_(D.char('a'), D.char('b'))

console.log(R.renderPrettyDefault(doc))
// a
// b

console.log(R.renderPrettyDefault(D.group(doc)))
// ab
```

```ts
export declare const appendWithLineBreak: <A>(that: Doc<A>) => (self: Doc<A>) => Doc<A>;
```

### appendWithSoftLine

The `appendWithSoftLine` combinator concatenates two documents by placing a
`softLine` document between them.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.appendWithSoftLine_(D.char('a'), D.char('b'))

console.log(R.renderPrettyDefault(doc))
// a b

console.log(pipe(doc, R.renderPretty(1)))
// a
// b
```

```ts
export declare const appendWithSoftLine: <A>(that: Doc<A>) => (self: Doc<A>) => Doc<A>;
```

### appendWithSoftLineBreak

The `appendWithSoftLineBreak` combinator concatenates two documents by
placing a `softLineBreak` document between them.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.appendWithSoftLineBreak_(D.char('a'), D.char('b'))

console.log(R.renderPrettyDefault(doc))
// ab

console.log(pipe(doc, R.renderPretty(1)))
// a
// b
```

```ts
export declare const appendWithSoftLineBreak: <A>(that: Doc<A>) => (self: Doc<A>) => Doc<A>;
```

### appendWithSpace

The `appendWithSpace` combinator concatenates two documents by placing a
`space` document between them.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.appendWithSpace_(D.char('a'), D.char('b'))

console.log(R.renderPrettyDefault(doc))
// a b
```

```ts
export declare const appendWithSpace: <A>(that: Doc<A>) => (self: Doc<A>) => Doc<A>;
```

### backslash

A document containing a single `\` character.

```ts
export declare const backslash: Doc<never>;
```

### braced

Encloses the input document in braces (`{}`).

```ts
export declare const braced: <A>(self: Doc<A>) => Doc<A>;
```

### bracketed

Encloses the input document in brackets (`[]`).

```ts
export declare const bracketed: <A>(self: Doc<A>) => Doc<A>;
```

### cat

```ts
export declare const cat: <A, B>(left: Doc<A>, right: Doc<B>) => Doc<A | B>;
```

### cats

The `cats` combinator will attempt to lay out a collection of documents
separated by nothing. If the output does not fit the page, then the documents
will be separated by newlines. This is what differentiates it from `vcat`,
which always lays out documents beneath one another.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hsep([
  D.text('Docs:'),
  D.cats(D.words('lorem ipsum dolor'))
])

console.log(R.renderPrettyDefault(doc))
// Docs: loremipsumdolor

// If the document exceeds the width of the page, the documents are rendered
// one above another
console.log(pipe(doc, R.renderPretty(10)))
// Docs: lorem
// ipsum
// dolor
```

```ts
export declare const cats: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### catsT

Tupled variant of `cats`.

```ts
export declare const catsT: <Docs extends NonEmptyArrayDoc>(...docs: Docs) => Doc<[Docs[number]] extends [{ _A: () => infer A; }] ? A : never>;
```

### changesUponFlattening

Select the first element of each `Union` and discard the first element of
each `FlatAlt` to produce a "flattened" version of the input document.

The result is `Flattened` if the element might change depending on the chosen
layout algorithm (i.e., the resulting document contains sub-documents that
may be rendered differently).

The result is `AlreadyFlat` if the document is static (i.e., the resulting
document contains only a plain `Empty` node).

`NeverFlat` is returned when the document cannot be flattened because it
contains either a hard `Line` or a `Fail`.

```ts
export declare const changesUponFlattening: <A>(self: Doc<A>) => Flatten<Doc<A>>;
```

### char

A document containing a single character.

**Invariants**
- Cannot be the newline (`"\n"`) character

```ts
export declare const char: (char: string) => Doc<never>;
```

### colon

A document containing a single `:` character.

```ts
export declare const colon: Doc<never>;
```

### column

Lays out a document depending upon the column at which the document starts.

```typescript
import * as A from '@effect-ts/core/Array'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

// Example 1:
const example1 = D.column((l) => D.hsep([D.text('Columns are'), D.text(`${l}-based.`)]))

console.log(R.renderPrettyDefault(example1))
// Columns are 0-based.

// Example 2:
const doc = D.hsep([
  D.text('prefix'),
  D.column((l) => D.text(`| <- column ${l}`))
])

const example2 = D.vsep(A.map_([0, 4, 8], (n) => D.indent_(doc, n)))

console.log(R.renderPrettyDefault(example2))
// prefix | <- column 7
//     prefix | <- column 11
//         prefix | <- column 15
```

```ts
export declare const column: <A>(react: (position: number) => Doc<A>) => Doc<A>;
```

### comma

A document containing a single `,` character.

```ts
export declare const comma: Doc<never>;
```

### concatWith

The `concatWith` combinator concatenates all documents in a collection
element-wise with the specified binary function.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = pipe(
  [D.char('a'), D.char('b')],
  D.concatWith(D.appendWithSpace_)
)

console.log(R.renderPrettyDefault(doc))
// a b
```

```ts
export declare const concatWith: <A>(docs: Collection<Doc<A>>, f: (x: Doc<A>, y: Doc<A>) => Doc<A>) => Doc<A>;
```

### dot

A document containing a single `.` character.

```ts
export declare const dot: Doc<never>;
```

### doubleQuoted

Encloses the input document in double quotes (`""`).

```ts
export declare const doubleQuoted: <A>(self: Doc<A>) => Doc<A>;
```

### dquote

A document containing a single `"` character.

```ts
export declare const dquote: Doc<never>;
```

### empty

The `empty` document behaves like a document containing the empty string
(`""`), so it has a height of `1`.

This may lead to surprising behavior if the empty document is expected to
bear no weight inside certain layout functions, such as`vcat`, where it will
render an empty line of output.

```typescript
import * as Doc from '@effect/printer/Doc'
import * as Render from '@effect/printer/Render'

const doc = Doc.vsep([
  Doc.text('hello'),
  Doc.parens(D.empty), // `parens` for visibility purposes only
  Doc.text('world')
])

console.log(Render.renderPrettyDefault(doc))
// hello
// ()
// world
```

```ts
export declare const empty: Doc<never>;
```

### encloseSep

The `encloseSep` combinator concatenates a collection of documents,
separating each document in the collection using the specified `sep`
document. After concatenation, the resulting document is enclosed by the
specified `left` and `right` documents.

To place the `sep` document at the end of each entry, see the `punctuate`
combinator.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as A from '@effect-ts/core/Array'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hsep([
  D.text("list"),
  D.align(
    pipe(
      A.map_(["1", "20", "300", "4000"], (n) =>
        n.length === 1 ? D.char(n) : D.text(n)
      ),
      D.encloseSep(D.lbracket, D.rbracket, D.comma)
    )
  )
])

// The documents are laid out horizontally if that fits the page:
console.log(R.renderPrettyDefault(doc))
// list [1,20,300,4000]

// Otherwise they are laid out vertically, with separators put in the front:
console.log(pipe(doc, R.renderPretty(10)))
// list [1
//      ,20
//      ,300
//      ,4000]
```

```ts
export declare const encloseSep: <A, B, C, D>(docs: Collection<Doc<D>>, left: Doc<A>, right: Doc<B>, sep: Doc<C>) => Doc<A | B | C | D>;
```

### equalSign

A document containing a single `=` character.

```ts
export declare const equalSign: Doc<never>;
```

### fail

The `fail` document is a document that cannot be rendered.

Generally occurs when flattening a line. The layout algorithms will reject
this document and choose a more suitable rendering.

```ts
export declare const fail: Doc<never>;
```

### fill

The `fill` combinator first lays out the document `x` and then appends
`space`s until the width of the document is equal to the specified `width`.
If the width of `x` is already larger than the specified `width`, nothing is
appended.

```typescript
import type { Array } from '@effect-ts/core/Array'
import * as A from '@effect-ts/core/Array'
import type { Doc } from '@effect-ts/printer/Core/Doc'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

type Signature = [name: string, type: string]

const signatures: Array<Signature> = [
  ['empty', 'Doc'],
  ['nest', 'Int -> Doc -> Doc'],
  ['fillSep', '[Doc] -> Doc']
]

const prettySignature = <A>([name, type]: Signature): Doc<A> =>
  D.hsep([D.fill_(D.text(name), 5), D.text('::'), D.text(type)])

const doc = D.hsep([
  D.text('let'),
  D.align(D.vcat(A.map_(signatures, prettySignature)))
])

console.log(R.renderPrettyDefault(doc))
// let empty :: Doc
//     nest  :: Int -> Doc -> Doc
//     fillSep :: [Doc] -> Doc
```

```ts
export declare const fill: <A>(width: number) => (self: Doc<A>) => Doc<A>;
```

### fillBreak

The `fillBreak` combinator first lays out the document `x` and then appends
`space`s until the width of the document is equal to the specified `width`.
If the width of `x` is already larger than the specified `width`, the nesting
level is increased by the specified `width` and a `line` is appended.

```typescript
import { pipe } from '@effect-ts/core/Function'
import type { Array } from '@effect-ts/core/Array'
import * as A from '@effect-ts/core/Array'
import type { Doc } from '@effect-ts/printer/Core/Doc'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

type Signature = [name: string, type: string]

const signatures: Array<Signature> = [
  ['empty', 'Doc'],
  ['nest', 'Int -> Doc -> Doc'],
  ['fillSep', '[Doc] -> Doc']
]

const prettySignature = <A>([name, type]: Signature): Doc<A> =>
  D.hsep([D.fillBreak_(D.text(name), 5), D.text('::'), D.text(type)])

const doc = D.hsep([
  D.text('let'),
  D.align(D.vcat(A.map_(signatures, prettySignature)))
])

console.log(R.renderPrettyDefault(doc))
// let empty :: Doc
//     nest  :: Int -> Doc -> Doc
//     fillSep
//           :: [Doc] -> Doc
```

```ts
export declare const fillBreak: <A>(width: number) => (self: Doc<A>) => Doc<A>;
```

### fillCat

The `fillCat` combinator concatenates all documents in a collection
horizontally by placing a `empty` between each pair of documents as long as
they fit the page. Once the page width is exceeded, a `lineBreak` is inserted
and the process is repeated for all documents in the collection.

**Note**: the use of `lineBreak` means that if `group`ed, the documents will
be separated with `empty` instead of newlines. See `fillSep` if you want a
`space` instead.

```ts
export declare const fillCat: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### fillSep

The `fillSep` combinator concatenates all documents in a collection
horizontally by placing a `space` between each pair of documents as long as
they fit the page. Once the page width is exceeded, a `line` is inserted and
the process is repeated for all documents in the collection.

**Note**: the use of `line` means that if `group`ed, the documents will be
separated with a `space` instead of newlines. See `fillCat` if you do not
want a `space`.

```ts
export declare const fillSep: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### flatAlt

The `flatAlt` document will render `left` by default. However, when
`group`ed, `y` will be preferred with `left` as the fallback for cases where
`y` does not fit onto the page.

**NOTE:**
Users should be careful to ensure that `left` is less wide than `right`.
Otherwise, if `right` ends up not fitting the page, then the layout
algorithms will fall back to an even wider layout.

```typescript
import type { Array } from '@effect-ts/core/Array'
import { pipe } from '@effect-ts/core/Function'
import type { Doc } from '@effect-ts/printer/Core/Doc'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const open = D.flatAlt_(D.empty, D.text('{ '))
const close = D.flatAlt_(D.empty, D.text(' }'))
const separator = D.flatAlt_(D.empty, D.text('; '))

const prettyDo = <A>(xs: Array<Doc<A>>): Doc<A> =>
  D.group(D.hsep([D.text('do'), D.align(D.encloseSep_(xs, open, close, separator))]))

const statements = [
  D.text('name:_ <- getArgs'),
  D.text('let greet = "Hello, " <> name"'),
  D.text('putStrLn greet')
]

// If it fits, then the content is put onto a single line with the `{;}` style
console.log(pipe(prettyDo(statements), R.renderPretty(80)))
// do { name:_ <- getArgs; let greet = "Hello, " <> name"; putStrLn greet }

// When there is not enough space, the content is broken up onto multiple lines
console.log(pipe(prettyDo(statements), R.renderPretty(10)))
// do name:_ <- getArgs
//    let greet = "Hello, " <> name"
//    putStrLn greet
```

```ts
export declare const flatAlt: <A, B>(left: Doc<A>, right: Doc<B>) => Doc<A | B>;
```

### flatten

Flattens a document but does not report changes.

```ts
export declare const flatten: <A>(self: Doc<A>) => Doc<A>;
```

### fold

```ts
export declare const fold: <A, R>(patterns: { readonly Fail: () => R; readonly Empty: () => R; readonly Char: (char: string) => R; readonly Text: (text: string) => R; readonly Line: () => R; readonly FlatAlt: (x: Doc<A>, y: Doc<A>) => R; readonly Cat: (x: Doc<A>, y: Doc<A>) => R; readonly Nest: (indent: number, doc: Doc<A>) => R; readonly Union: (x: Doc<A>, y: Doc<A>) => R; readonly Column: (react: (position: number) => Doc<A>) => R; readonly WithPageWidth: (react: (pageWidth: PageWidth) => Doc<A>) => R; readonly Nesting: (react: (level: number) => Doc<A>) => R; readonly Annotated: (annotation: A, doc: Doc<A>) => R; }) => (self: Doc<A>) => R;
```

### getAssociative

```ts
export declare const getAssociative: <A>() => Associative<Doc<A>>;
```

### getAssociativeIdentity

```ts
export declare const getAssociativeIdentity: <A>() => AssociativeIdentity<Doc<A>>;
```

### group

The `group` combinator attempts to lay out a document onto a single line by
removing the contained line breaks. If the result does not fit the page, or
if a `hardLine` prevents flattening the document, `x` is laid out without
any changes.

The `group` function is key to layouts that adapt to available space nicely.

```ts
export declare const group: <A>(self: Doc<A>) => Doc<A>;
```

### hang

The `hang` combinator lays out a document with the nesting level set to
the *current column* plus the specified `indent`. Negative values for
`indent` are allowed and decrease the nesting level accordingly.

This differs from the `nest` combinator, which is based on the *current
nesting level* plus the specified `indent`. When you're not sure, try the
more efficient combinator (`nest`) first.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hsep([
  D.text('prefix'),
  D.hang_(D.reflow('Indenting these words with hang'), 4)
])

console.log(pipe(doc, R.renderPretty(24)))
// prefix Indenting these
//            words with
//            hang
```

```ts
export declare const hang: <A>(indent: number) => (self: Doc<A>) => Doc<A>;
```

### hardLine

The `hardLine` document is always laid out as a line break, regardless of
space or whether or not the document was `group`'ed.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hcat([
  D.text('lorem ipsum'),
  D.hardLine,
  D.text('dolor sit amet')
])

console.log(pipe(doc, R.renderPretty(1000)))
// lorem ipsum
// dolor sit amet
```

```ts
export declare const hardLine: Doc<never>;
```

### hcat

The `hcat` combinator concatenates all documents in a collection horizontally
without any spacing.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hcat(D.words('lorem ipsum dolor'))

console.log(R.renderPrettyDefault(doc))
// loremipsumdolor
```

```ts
export declare const hcat: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### hcatT

Tupled variant of `hcat`.

```ts
export declare const hcatT: <Docs extends NonEmptyArrayDoc>(...docs: Docs) => Doc<[Docs[number]] extends [{ _A: () => infer A; }] ? A : never>;
```

### hsep

The `hsep` combinator concatenates all documents in a collection horizontally
by placing a `space` between each pair of documents.

For automatic line breaks, consider using `fillSep`.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hsep(D.words('lorem ipsum dolor sit amet'))

console.log(pipe(doc, R.renderPretty(80)))
// lorem ipsum dolor sit amet

// The `hsep` combinator will not introduce line breaks on its own, even when
// the page is too narrow
console.log(pipe(doc, R.renderPretty(5)))
// lorem ipsum dolor sit amet
```

```ts
export declare const hsep: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### isAnnotated

```ts
export declare const isAnnotated: <A>(doc: Doc<A>) => doc is Annotated<A>;
```

### isCat

```ts
export declare const isCat: <A>(doc: Doc<A>) => doc is Cat<A>;
```

### isChar

```ts
export declare const isChar: <A>(doc: Doc<A>) => doc is Char<A>;
```

### isColumn

```ts
export declare const isColumn: <A>(doc: Doc<A>) => doc is Column<A>;
```

### isEmpty

```ts
export declare const isEmpty: <A>(doc: Doc<A>) => doc is Empty<A>;
```

### isFail

```ts
export declare const isFail: <A>(doc: Doc<A>) => doc is Fail<A>;
```

### isFlatAlt

```ts
export declare const isFlatAlt: <A>(doc: Doc<A>) => doc is FlatAlt<A>;
```

### isLine

```ts
export declare const isLine: <A>(doc: Doc<A>) => doc is Line<A>;
```

### isNest

```ts
export declare const isNest: <A>(doc: Doc<A>) => doc is Nest<A>;
```

### isNesting

```ts
export declare const isNesting: <A>(doc: Doc<A>) => doc is Nesting<A>;
```

### isText

```ts
export declare const isText: <A>(doc: Doc<A>) => doc is Text<A>;
```

### isUnion

```ts
export declare const isUnion: <A>(doc: Doc<A>) => doc is Union<A>;
```

### isWithPageWidth

```ts
export declare const isWithPageWidth: <A>(doc: Doc<A>) => doc is WithPageWidth<A>;
```

### langle

A document containing a single `<` character.

```ts
export declare const langle: Doc<never>;
```

### lbrace

A document containing a single `{` character.

```ts
export declare const lbrace: Doc<never>;
```

### lbracket

A document containing a single `[` character.

```ts
export declare const lbracket: Doc<never>;
```

### line

The `line` document advances to the next line and indents to the current
nesting level. However, `line` will behave like `space` if the line break is
undone by `group`.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hcat([
  D.text('lorem ipsum'),
  D.line,
  D.text('dolor sit amet')
])

console.log(R.renderPrettyDefault(doc))
// lorem ipsum
// dolor sit amet

console.log(R.renderPrettyDefault(D.group(doc)))
// lorem ipsum dolor sit amet
```

```ts
export declare const line: Doc<never>;
```

### lineBreak

The `lineBreak` document is like `line` but behaves like `empty` if the line
break is undone by `group` (instead of `space`).

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hcat([
  D.text('lorem ipsum'),
  D.lineBreak,
  D.text('dolor sit amet')
])

console.log(R.renderPrettyDefault(doc))
// lorem ipsum
// dolor sit amet

console.log(R.renderPrettyDefault(D.group(doc)))
// lorem ipsumdolor sit amet
```

```ts
export declare const lineBreak: Doc<never>;
```

### list

A Haskell-inspired variant of `encloseSep` that uses a comma as the separator
and braces as the enclosure for a collection of documents.

```typescript
import * as A from "@effect-ts/core/Array"
import * as D from "@effect-ts/printer/Core/Doc"
import * as R from "@effect-ts/printer/Core/Render"

const doc = D.list(
  A.map_(["1", "20", "300", "4000"], (n) => (n.length === 1 ? D.char(n) : D.text(n)))
)

console.log(R.renderPrettyDefault(doc))
// [1, 20, 300, 4000]
```

```ts
export declare const list: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### lparen

A document containing a single `(` character.

```ts
export declare const lparen: Doc<never>;
```

### nest

Lays out a document with the current nesting level (indentation
of the following lines) increased by the specified `indent`.
Negative values are allowed and will decrease the nesting level
accordingly.

See also:
* `hang`: nest a document relative to the current cursor
position instead of the current nesting level
* `align`: set the nesting level to the current cursor
position
* `indent`: increase the indentation on the spot, padding
any empty space with spaces

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.vsep([
  D.nest_(D.vsep(D.words('lorem ipsum dolor')), 4),
  D.text('sit'),
  D.text('amet')
])

console.log(R.renderPrettyDefault(doc))
// lorem
//     ipsum
//     dolor
// sit
// amet
```

```ts
export declare const nest: <A>(doc: Doc<A>, indent: number) => Doc<A>;
```

### nesting

Lays out a document depending upon the current nesting level (i.e., the
current indentation of the document).

```typescript
import * as A from '@effect-ts/core/Array'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hsep([D.text('prefix'), D.nesting((l) => D.brackets(D.text(`Nested: ${l}`)))])

const example = D.vsep(A.map_([0, 4, 8], (n) => D.indent_(doc, n)))

console.log(R.renderPrettyDefault(example))
// prefix [Nested: 0]
//     prefix [Nested: 4]
//         prefix [Nested: 8]
```

```ts
export declare const nesting: <A>(react: (level: number) => Doc<A>) => Doc<A>;
```

### parenthesized

Encloses the input document in parentheses (`()`).

```ts
export declare const parenthesized: <A>(self: Doc<A>) => Doc<A>;
```

### punctuate

The `punctuate` combinator appends the `punctuator` document to all but the
last document in a collection of documents. The separators are places after
the document entries, which can be observed if the result is oriented
vertically.

```typescript
import * as D from "@effect-ts/printer/Core/Doc"
import * as R from "@effect-ts/printer/Core/Render"

const docs = D.punctuate_(D.words("lorem ipsum dolor sit amet"), D.comma)

console.log(R.renderPrettyDefault(D.hsep(docs)))
// lorem, ipsum, dolor, sit, amet

// The separators are put at the end of the entries, which can be better
// visualzied if the documents are rendered vertically
console.log(R.renderPrettyDefault(D.vsep(docs)))
// lorem,
// ipsum,
// dolor,
// sit,
// amet
```

```ts
export declare const punctuate: <A, B>(docs: Collection<Doc<B>>, punctuator: Doc<A>) => Chunk<Doc<A | B>>;
```

### rangle

A document containing a single `>` character.

```ts
export declare const rangle: Doc<never>;
```

### rbrace

A document containing a single `}` character.

```ts
export declare const rbrace: Doc<never>;
```

### rbracket

A document containing a single `]` character.

```ts
export declare const rbracket: Doc<never>;
```

### reAnnotate

Changes the annotation of a document. Useful for modifying documents embedded
with one form of annotation with a more general annotation.

**Note** that with each invocation, the entire document tree is traversed.
If possible, it is preferable to reannotate a document after producing the
layout using `reAnnotateS`.

```ts
export declare const reAnnotate: <A, B>(f: (a: A) => B) => (self: Doc<A>) => Doc<B>;
```

### reflow

Splits a string of words into individual `Text` documents using the specified
`char` to split on (defaults to `' '`). In addition, a `softLine` is inserted
in between each word so that if the text exceeds the available width it will
be broken into multiple lines.

```typescript
import { pipe } from '@effect-ts/core/Function'

import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.reflow(
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit, ' +
    'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
)

console.log(pipe(doc, R.renderPretty(32)))
// Lorem ipsum dolor sit amet,
// consectetur adipisicing elit,
// sed do eiusmod tempor incididunt
// ut labore et dolore magna
// aliqua.
```

```ts
export declare const reflow: (s: string, char?: string) => Doc<never>;
```

### rparen

A document containing a single `)` character.

```ts
export declare const rparen: Doc<never>;
```

### semi

A document containing a single `;` character.

```ts
export declare const semi: Doc<never>;
```

### seps

The `seps` combinator will attempt to lay out a collection of documents
separated by `space`s. If the output does not fit the page, then the
documents will be separated by newlines. This is what differentiates it from
`vsep`, which always lays out documents beneath one another.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.hsep([
  D.text('prefix'),
  D.seps(D.words('text to lay out'))
])

console.log(R.renderPrettyDefault(doc))
// prefix text to lay out

// If the page width is too narrow, documents are separated by newlines
console.log(pipe(doc, R.renderPretty(20)))
// prefix text
// to
// lay
// out
```

```ts
export declare const seps: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### singleQuoted

Encloses the input document in single quotes (`''`).

```ts
export declare const singleQuoted: <A>(self: Doc<A>) => Doc<A>;
```

### slash

A document containing a single `/` character.

```ts
export declare const slash: Doc<never>;
```

### softLine

The `softLine` document behaves like `space` if the resulting output fits
onto the page, otherwise it behaves like `line`.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

// Here we have enough space to put everything onto one line:
const doc = D.hcat([
  D.text('lorem ipsum'),
  D.softLine,
  D.text('dolor sit amet')
])

console.log(pipe(doc, R.renderPretty(80)))
// lorem ipsum dolor sit amet

// If the page width is narrowed to `10`, the layout algorithm will
// introduce a line break:
console.log(pipe(doc, R.renderPretty(10)))
// lorem ipsum
// dolor sit amet
```

```ts
export declare const softLine: Doc<never>;
```

### softLineBreak

The `softLineBreak` document is similar to `softLine`, but behaves like
`empty` if the resulting output does not fit onto the page (instead of
`space`).

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

// With enough space, we get direct concatenation of documents:
const doc = D.hcat([
  D.text('ThisText'),
  D.softLineBreak,
  D.text('IsWayTooLong')
])

console.log(pipe(doc, R.renderPretty(80)))
// ThisTextIsWayTooLong

// If the page width is narrowed to `10`, the layout algorithm will
// introduce a line break:
console.log(pipe(doc, R.renderPretty(10)))
// ThisText
// IsWayTooLong
```

```ts
export declare const softLineBreak: Doc<never>;
```

### space

A document containing a single ` ` character.

```ts
export declare const space: Doc<never>;
```

### spaces

The `spaces` combinator lays out a document containing `n` spaces. Negative
values for `n` count as `0` spaces.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.brackets(D.dquotes(D.spaces(5)))

console.log(R.renderPrettyDefault(doc))
// ["     "]
```

```ts
export declare const spaces: (n: number) => Doc<never>;
```

### squote

A document containing a single `'` character.

```ts
export declare const squote: Doc<never>;
```

### string

A document containing a string of text. Newline characters (`\n`) contained
in the provided string will be disregarded (i.e. not rendered) in the output
document.

```ts
export declare const string: (str: string) => Doc<never>;
```

### surround

The `enclose` combinator encloses a document `x` in between `left` and
`right` documents.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = pipe(D.char('-'), D.enclose(D.char('A'), D.char('Z')))

console.log(R.renderPrettyDefault(doc))
// A-Z
```

```ts
export declare const surround: <B, C>(left: Doc<B>, right: Doc<C>) => <A>(self: Doc<A>) => Doc<B | C | A>;
```

### text

A document containing a string of text.

**Invariants**
- Text cannot be less than two characters long
- Text cannot contain a newline (`"\n"`) character

```ts
export declare const text: (text: string) => Doc<never>;
```

### textSpaces

Constructs a string containing `n` space characters.

```ts
export declare const textSpaces: (n: number) => string;
```

### tupled

A Haskell-inspired variant of `encloseSep` that uses a comma as the separator
and parentheses as the enclosure for a collection of documents.

```typescript
import * as A from "@effect-ts/core/Array"
import * as D from "@effect-ts/printer/Core/Doc"
import * as R from "@effect-ts/printer/Core/Render"

const doc = D.tupled(
  A.map_(["1", "20", "300", "4000"], (n) => (n.length === 1 ? D.char(n) : D.text(n)))
)

console.log(R.renderPrettyDefault(doc))
// (1, 20, 300, 4000)
```

```ts
export declare const tupled: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### unAnnotate

Removes all annotations from a document.

**Note**: with each invocation, the entire document tree is traversed.
If possible, it is preferable to unannotate a document after producing the
layout using `unAnnotateS`.

```ts
export declare const unAnnotate: <A>(self: Doc<A>) => Doc<never>;
```

### unifyDoc

```ts
export declare const unifyDoc: <X extends Doc<any>>(self: X) => Doc<[X] extends [{ _A: () => infer A; }] ? A : never>;
```

### union

```ts
export declare const union: <A, B>(left: Doc<A>, right: Doc<B>) => Doc<A | B>;
```

### vbar

A document containing a single `|` character.

```ts
export declare const vbar: Doc<never>;
```

### vcat

The `vcat` combinator concatenates all documents in a collection vertically.
If the output is grouped then the line breaks are removed.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.vcat(D.words('lorem ipsum dolor'))

console.log(R.renderPrettyDefault(doc))
// lorem
// ipsum
// dolor
```

```ts
export declare const vcat: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### vsep

The `vsep` combinator concatenates all documents in a collection vertically.
If a `group` undoes the line breaks inserted by `vsep`, the documents are
separated with a space instead.

When a `vsep` is `group`ed, the documents are separated with a `space` if the
layoutfits the page, otherwise nothing is done. See the `sep` convenience
function for this use case.

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const unaligned = D.hsep([
  D.text('prefix'),
  D.vsep(D.words('text to lay out'))
])

console.log(R.renderPrettyDefault(unaligned))
// prefix text
// to
// lay
// out

// The `align` function can be used to align the documents under their first element
const aligned = D.hsep([
  D.text('prefix'),
  D.align(D.vsep(D.words('text to lay out')))
])

console.log(R.renderPrettyDefault(aligned))
// prefix text
//        to
//        lay
//        out
```

```ts
export declare const vsep: <A>(docs: Collection<Doc<A>>) => Doc<A>;
```

### width

The `width` combinator makes the column width of a document available to the
document while rendering.

```typescript
import * as A from "@effect-ts/core/Array"
import { flow } from "@effect-ts/core/Function"
import type { Doc } from "@effect-ts/printer/Core/Doc"
import * as D from "@effect-ts/printer/Core/Doc"
import * as R from "@effect-ts/printer/Core/Render"

const annotate: <A>(doc: Doc<A>) => Doc<A> = flow(
  D.brackets,
  D.width((w) => D.text(` <- width: ${w}`))
)

const docs = [
  D.text("---"),
  D.text("------"),
  D.indent_(D.text("---"), 3),
  D.vsep([D.text("---"), D.indent_(D.text("---"), 4)])
]

const doc = D.align(D.vsep(A.map_(docs, annotate)))

console.log(R.renderPrettyDefault(doc))
// [---] <- width: 5
// [------] <- width: 8
// [   ---] <- width: 8
// [---
//     ---] <- width: 8
```

```ts
export declare const width: <A, B>(react: (width: number) => Doc<A>) => (self: Doc<B>) => Doc<A | B>;
```

### withPageWidth

Lays out a document according to the document's`PageWidth`.

```typescript
import { pipe } from '@effect-ts/core/Function'
import * as A from '@effect-ts/core/Array'
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'
import * as PW from '@effect-ts/printer/Core/PageWidth'

const doc = D.hsep([
  D.text('prefix'),
  D.withPageWidth(
    PW.match({
      AvailablePerLine: (lw, rf) => D.brackets(D.text(`Width: ${lw}, Ribbon Fraction: ${rf}`)),
      Unbounded: () => D.empty
    })
  )
])

const example = D.vsep(A.map_([0, 4, 8], (n) => D.indent_(doc, n)))

console.log(pipe(example, R.renderPretty(32)))
// prefix [Width: 32, Ribbon Fraction: 1]
//     prefix [Width: 32, Ribbon Fraction: 1]
//         prefix [Width: 32, Ribbon Fraction: 1]
```

```ts
export declare const withPageWidth: <A>(react: (pageWidth: PageWidth) => Doc<A>) => Doc<A>;
```

### words

Splits a string of words into individual `Text` documents using the
specified `char` to split on (defaults to `' '`).

```typescript
import * as D from '@effect-ts/printer/Core/Doc'
import * as R from '@effect-ts/printer/Core/Render'

const doc = D.tupled(D.words('lorem ipsum dolor'))

console.log(R.renderPrettyDefault(doc))
// (lorem, ipsum, dolor)
```

```ts
export declare const words: (s: string, char?: string) => Chunk<Doc<never>>;
```

