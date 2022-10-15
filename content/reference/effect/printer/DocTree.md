## DocTree

Reference Documentation for the module '@effect/printer/DocTree'

Represents a document that has been laid out into a tree-like structure.

A `DocStream` is a linked list of different annotated cons cells (i.e.
`TextStream` and then some further `DocStream`, `LineStream` and then some
further `DocStream`, etc.). The `DocStream` format is quite suitable as a
target for a layout engine, but is not suitable for rendering to a more
structured format, such as HTML, where we do not want to perform a lookahead
until the end of some pre-defined markup. These formats would benefit more
from a tree-like structure that explicitly marks its contents as annotated.
A `DocTree` is therefore much more suitable for this use case.

```ts
export type DocTree<A> = EmptyTree<A> | CharTree<A> | TextTree<A> | LineTree<A> | AnnotationTree<A> | ConcatTree<A>;
```

## General API

### alterAnnotations

Change the annotation of a document to a different annotation, or none at
all.

```ts
export declare const alterAnnotations: <A, B>(f: (a: A) => Collection<B>) => (self: DocTree<A>) => DocTree<B>;
```

### alterAnnotationsSafe

```ts
export declare const alterAnnotationsSafe: <A, B>(self: DocTree<A>, f: (a: A) => Collection<B>) => Eval<DocTree<B>>;
```

### annotation

Annotate the specified `DocTree` with an annotation of type `A`.

```ts
export declare const annotation: <A>(tree: DocTree<A>, annotation: A) => DocTree<A>;
```

### char

```ts
export declare const char: <A>(char: string) => DocTree<A>;
```

### concat

Horizontally concatenates multiple `DocTree`s.

```ts
export declare const concat: <A>(trees: Chunk<DocTree<A>>) => DocTree<A>;
```

### empty

```ts
export declare const empty: DocTree<never>;
```

### foldMap

```ts
export declare const foldMap: <A, I>(I: AssociativeIdentity<I>, f: (a: A) => I) => (self: DocTree<A>) => I;
```

### getAssociative

```ts
export declare const getAssociative: <A>() => Associative<DocTree<A>>;
```

### getAssociativeIdentity

```ts
export declare const getAssociativeIdentity: <A>() => AssociativeIdentity<DocTree<A>>;
```

### line

```ts
export declare const line: <A>(indentation: number) => DocTree<A>;
```

### reAnnotate

Change the annotation of a `DocTree`.

```ts
export declare const reAnnotate: <A, B>(f: (a: A) => B) => (self: DocTree<A>) => DocTree<B>;
```

### text

```ts
export declare const text: <A>(text: string) => DocTree<A>;
```

### treeForm

```ts
export declare const treeForm: <A>(stream: DocStream<A>) => DocTree<A>;
```

### unAnnotate

Remove all annotations from a `DocTree`.

```ts
export declare const unAnnotate: <A>(self: DocTree<A>) => DocTree<never>;
```

