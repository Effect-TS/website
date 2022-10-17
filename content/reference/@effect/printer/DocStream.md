## DocStream

Reference Documentation for the module '@effect/printer/DocStream'

Represents a document that has been laid out and can be processed used by the
rendering algorithms.

A simplified view is that a `Doc` is equivalent to an array of `DocStream`,
and the layout algorithms simply pick a `DocStream` based upon which instance
best fits the layout constraints. Therefore, a `DocStream` has all complexity
contained in a `Doc` resolved, making it very easy to convert to other
formats, such as plaintext or terminal output.

```ts
export type DocStream<A> = FailedStream<A> | EmptyStream<A> | CharStream<A> | TextStream<A> | LineStream<A> | PushAnnotationStream<A> | PopAnnotationStream<A>;
```

## General API

### alterAnnotations

Changes the annotation of a document to a different annotation, or to
none at all.

```ts
export declare const alterAnnotations: <A, B>(f: (a: A) => Maybe<B>) => (self: DocStream<A>) => DocStream<B>;
```

### char

```ts
export declare const char: <A>(stream: DocStream<A>, char: string) => DocStream<A>;
```

### empty

```ts
export declare const empty: DocStream<never>;
```

### failed

```ts
export declare const failed: DocStream<never>;
```

### fold

```ts
export declare const fold: <A, R>(patterns: { readonly FailedStream: () => R; readonly EmptyStream: () => R; readonly CharStream: (char: string, stream: DocStream<A>) => R; readonly TextStream: (text: string, stream: DocStream<A>) => R; readonly LineStream: (indentation: number, stream: DocStream<A>) => R; readonly PushAnnotationStream: (annotation: A, stream: DocStream<A>) => R; readonly PopAnnotationStream: (stream: DocStream<A>) => R; }) => (self: DocStream<A>) => R;
```

### foldMap

```ts
export declare const foldMap: <A, I>(I: AssociativeIdentity<I>, f: (a: A) => I) => (self: DocStream<A>) => I;
```

### isCharStream

```ts
export declare const isCharStream: <A>(stream: DocStream<A>) => stream is CharStream<A>;
```

### isEmptyStream

```ts
export declare const isEmptyStream: <A>(stream: DocStream<A>) => stream is EmptyStream<A>;
```

### isFailedStream

```ts
export declare const isFailedStream: <A>(stream: DocStream<A>) => stream is FailedStream<A>;
```

### isLineStream

```ts
export declare const isLineStream: <A>(stream: DocStream<A>) => stream is LineStream<A>;
```

### isPopAnnotationStream

```ts
export declare const isPopAnnotationStream: <A>(stream: DocStream<A>) => stream is PopAnnotationStream<A>;
```

### isPushAnnotationStream

```ts
export declare const isPushAnnotationStream: <A>(stream: DocStream<A>) => stream is PushAnnotationStream<A>;
```

### isTextStream

```ts
export declare const isTextStream: <A>(stream: DocStream<A>) => stream is TextStream<A>;
```

### popAnnotation

```ts
export declare const popAnnotation: <A>(stream: DocStream<A>) => DocStream<A>;
```

### pushAnnotation

```ts
export declare const pushAnnotation: <A, B>(stream: DocStream<B>, annotation: A) => DocStream<A | B>;
```

### reAnnotate

Modify the annotations of a document.

```ts
export declare const reAnnotate: <A, B>(f: (a: A) => B) => (self: DocStream<A>) => DocStream<B>;
```

### text

```ts
export declare const text: <A>(stream: DocStream<A>, text: string) => DocStream<A>;
```

### unAnnotate

Remove all annotations from a document.

```ts
export declare const unAnnotate: <A>(self: DocStream<A>) => DocStream<never>;
```

