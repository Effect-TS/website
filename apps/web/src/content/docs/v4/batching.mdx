---
title: Batching
description: Optimize performance by batching requests and reducing redundant API calls, enhancing efficiency in data fetching and processing.
sidebar:
  order: 9
---

import { Aside } from "@astrojs/starlight/components"

In typical application development, when interacting with external APIs, databases, or other data sources, we often define functions that perform requests and handle their results or failures accordingly.

### Simple Model Setup

Here's a basic model that outlines the structure of our data and possible errors:

```ts twoslash import.meta.vitest name="simple-model-setup-1"
import { Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

new GetUserError()._tag // => "GetUserError"
```

<Aside type="tip" title="Use Precise Types and Detailed Errors">
  In a real world scenario we may want to use a more precise types instead of
  directly using primitives for identifiers (see [Branded
  Types](/docs/v4/code-style/branded-types/)). Additionally, you may want to
  include more detailed information in the errors.
</Aside>

### Defining API Functions

Let's define functions that interact with an external API, handling common operations such as fetching todos, retrieving user details, and sending emails.

```ts twoslash collapse={7-25} import.meta.vitest name="defining-api-functions-1"
import { Effect, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// API
// ------------------------------

// Fetches a list of todos from an external API
const getTodos = Effect.tryPromise({
  try: () =>
    fetch("https://api.example.demo/todos").then(
      (res) => res.json() as Promise<Array<Todo>>,
    ),
  catch: () => new GetTodosError(),
})

// Retrieves a user by their ID from an external API
const getUserById = (id: number) =>
  Effect.tryPromise({
    try: () =>
      fetch(`https://api.example.demo/getUserById?id=${id}`).then(
        (res) => res.json() as Promise<User>,
      ),
    catch: () => new GetUserError(),
  })

// Sends an email via an external API
const sendEmail = (address: string, text: string) =>
  Effect.tryPromise({
    try: () =>
      fetch("https://api.example.demo/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address, text }),
      }).then((res) => res.json() as Promise<void>),
    catch: () => new SendEmailError(),
  })

// Sends an email to a user by fetching their details first
const sendEmailToUser = (id: number, message: string) =>
  getUserById(id).pipe(Effect.andThen((user) => sendEmail(user.email, message)))

// Notifies the owner of a todo by sending them an email
const notifyOwner = (todo: Todo) =>
  getUserById(todo.ownerId).pipe(
    Effect.andThen((user) =>
      sendEmailToUser(user.id, `hey ${user.name} you got a todo!`),
    ),
  )

new SendEmailError()._tag // => "SendEmailError"
```

<Aside type="tip" title="Validating API Responses">
  In a real-world scenario, you might not want to trust your APIs to always
  return the expected data - for this, you can use
  [`effect/Schema`](/docs/v4/schema/introduction/) or similar alternatives such
  as `zod`.
</Aside>

While this approach is straightforward and readable, it may not be the most efficient. Repeated API calls, especially when many todos share the same owner, can significantly increase network overhead and slow down your application.

### Using the API Functions

While these functions are clear and easy to understand, their use may not be the most efficient. For example, notifying todo owners involves repeated API calls which can be optimized.

```ts twoslash collapse={7-25,31-76} import.meta.vitest name="using-the-api-functions-1"
import { Effect, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// API
// ------------------------------

// Fetches a list of todos from an external API
const getTodos = Effect.tryPromise({
  try: () =>
    fetch("https://api.example.demo/todos").then(
      (res) => res.json() as Promise<Array<Todo>>,
    ),
  catch: () => new GetTodosError(),
})

// Retrieves a user by their ID from an external API
const getUserById = (id: number) =>
  Effect.tryPromise({
    try: () =>
      fetch(`https://api.example.demo/getUserById?id=${id}`).then(
        (res) => res.json() as Promise<User>,
      ),
    catch: () => new GetUserError(),
  })

// Sends an email via an external API
const sendEmail = (address: string, text: string) =>
  Effect.tryPromise({
    try: () =>
      fetch("https://api.example.demo/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address, text }),
      }).then((res) => res.json() as Promise<void>),
    catch: () => new SendEmailError(),
  })

// Sends an email to a user by fetching their details first
const sendEmailToUser = (id: number, message: string) =>
  getUserById(id).pipe(Effect.andThen((user) => sendEmail(user.email, message)))

// Notifies the owner of a todo by sending them an email
const notifyOwner = (todo: Todo) =>
  getUserById(todo.ownerId).pipe(
    Effect.andThen((user) =>
      sendEmailToUser(user.id, `hey ${user.name} you got a todo!`),
    ),
  )

// Orchestrates operations on todos, notifying their owners
const program = Effect.gen(function* () {
  const todos = yield* getTodos
  yield* Effect.forEach(todos, (todo) => notifyOwner(todo), {
    concurrency: "unbounded",
  })
})

new GetTodosError()._tag // => "GetTodosError"
```

This implementation performs an API call for each todo to fetch the owner's details and send an email. If multiple todos have the same owner, this results in redundant API calls.

<Aside type="tip" title="Improving Efficiency with Batch Calls">
  To optimize, consider implementing batch API calls if your backend supports
  them. This reduces the number of HTTP requests by grouping multiple operations
  into a single request, thereby enhancing performance and reducing load.
</Aside>

## Batching

Let's assume that `getUserById` and `sendEmail` can be batched. This means that we can send multiple requests in a single HTTP call, reducing the number of API requests and improving performance.

**Step-by-Step Guide to Batching**

1. **Declaring Requests:** We'll start by transforming our requests into structured data models. This involves detailing input parameters, expected outputs, and possible errors. Structuring requests this way not only helps in efficiently managing data but also in comparing different requests to understand if they refer to the same input parameters.

2. **Declaring Resolvers:** Resolvers are designed to handle multiple requests simultaneously. By leveraging the ability to compare requests (ensuring they refer to the same input parameters), resolvers can execute several requests in one go, maximizing the utility of batching.

3. **Defining Queries:** Finally, we'll define queries that utilize these batch-resolvers to perform operations. This step ties together the structured requests and their corresponding resolvers into functional components of the application.

<Aside type="caution" title="Ensuring Request Comparability">
  It's crucial for the requests to be modeled in a way that allows them to be
  comparable. This means implementing comparability (using methods like
  [Equals.equals](/docs/v4/trait/equal/)) to identify and batch identical
  requests effectively.
</Aside>

### Declaring Requests

We'll design a model using the concept of a `Request` that a data source might support:

```ts showLineNumbers=false
Request<Value, Error>
```

A `Request` is a construct representing a request for a value of type `Value`, which might fail with an error of type `Error`.

Let's start by defining a structured model for the types of requests our data sources can handle.

```ts twoslash collapse={7-25} import.meta.vitest name="declaring-requests-1"
import { Request, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// Requests
// ------------------------------

// Define a request to get multiple Todo items which might
// fail with a GetTodosError
interface GetTodos extends Request.Request<Array<Todo>, GetTodosError> {
  readonly _tag: "GetTodos"
}

// Create a tagged constructor for GetTodos requests
const GetTodos = Request.tagged<GetTodos>("GetTodos")

// Define a request to fetch a User by ID which might
// fail with a GetUserError
interface GetUserById extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

// Create a tagged constructor for GetUserById requests
const GetUserById = Request.tagged<GetUserById>("GetUserById")

// Define a request to send an email which might
// fail with a SendEmailError
interface SendEmail extends Request.Request<void, SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

// Create a tagged constructor for SendEmail requests
const SendEmail = Request.tagged<SendEmail>("SendEmail")

GetTodos()._tag // => "GetTodos"
```

Each request is defined with a specific data structure that extends from a generic `Request` type, ensuring that each request carries its unique data requirements along with a specific error type.

By using tagged constructors like `Request.tagged`, we can easily instantiate request objects that are recognizable and manageable throughout the application.

### Declaring Resolvers

After defining our requests, the next step is configuring how Effect resolves these requests using `RequestResolver`:

```ts showLineNumbers=false
RequestResolver<A>
```

A `RequestResolver<A>` is capable of executing requests of type `A`. The resolver passed to `Effect.request` must have no requirements of its own; see [Resolvers with Context](#resolvers-with-context) for how to resolve services before constructing one.

In this section, we'll create individual resolvers for each type of request. The granularity of your resolvers can vary, but typically, they are divided based on the batching capabilities of the corresponding API calls.

```ts twoslash collapse={7-25,31-59} import.meta.vitest name="declaring-resolvers-1"
import { Effect, Request, RequestResolver, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// Requests
// ------------------------------

// Define a request to get multiple Todo items which might
// fail with a GetTodosError
interface GetTodos extends Request.Request<Array<Todo>, GetTodosError> {
  readonly _tag: "GetTodos"
}

// Create a tagged constructor for GetTodos requests
const GetTodos = Request.tagged<GetTodos>("GetTodos")

// Define a request to fetch a User by ID which might
// fail with a GetUserError
interface GetUserById extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

// Create a tagged constructor for GetUserById requests
const GetUserById = Request.tagged<GetUserById>("GetUserById")

// Define a request to send an email which might
// fail with a SendEmailError
interface SendEmail extends Request.Request<void, SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

// Create a tagged constructor for SendEmail requests
const SendEmail = Request.tagged<SendEmail>("SendEmail")

// ------------------------------
// Resolvers
// ------------------------------

// Assuming GetTodos cannot be batched, we create a standard resolver
const GetTodosResolver = RequestResolver.fromEffect(
  (_: Request.Entry<GetTodos>): Effect.Effect<Todo[], GetTodosError> =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/todos").then(
          (res) => res.json() as Promise<Array<Todo>>,
        ),
      catch: () => new GetTodosError(),
    }),
)

// Assuming GetUserById can be batched, we create a batched resolver
const GetUserByIdResolver = RequestResolver.make(
  (entries: ReadonlyArray<Request.Entry<GetUserById>>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/getUserByIdBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            users: entries.map(({ request }) => ({ id: request.id })),
          }),
        }).then((res) => res.json()) as Promise<Array<User>>,
      catch: () => new GetUserError(),
    }).pipe(
      Effect.andThen((users) =>
        Effect.forEach(entries, (entry, index) =>
          Request.completeEffect(entry, Effect.succeed(users[index]!)),
        ),
      ),
      Effect.catch((error) =>
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.fail(error)),
        ),
      ),
    ),
)

// Assuming SendEmail can be batched, we create a batched resolver
const SendEmailResolver = RequestResolver.make(
  (entries: ReadonlyArray<Request.Entry<SendEmail>>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/sendEmailBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emails: entries.map(({ request }) => ({
              address: request.address,
              text: request.text,
            })),
          }),
        }).then((res) => res.json() as Promise<void>),
      catch: () => new SendEmailError(),
    }).pipe(
      Effect.andThen(
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.void),
        ),
      ),
      Effect.catch((error) =>
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.fail(error)),
        ),
      ),
    ),
)

SendEmail({ address: "a@b.com", text: "hi" })._tag // => "SendEmail"
```

<Aside type="tip" title="Accessing Context in Resolvers">
  Resolvers can also access the context like any other effect, and there are
  many different ways to create resolvers. For further details, consider
  exploring the reference documentation for the
  [RequestResolver](/docs/v4/api/effect/RequestResolver) module.
</Aside>

In this configuration:

- **GetTodosResolver** handles the fetching of multiple `Todo` items. It's set up as a standard resolver since we assume it cannot be batched.
- **GetUserByIdResolver** and **SendEmailResolver** are configured as batched resolvers. This setup is based on the assumption that these requests can be processed in batches, enhancing performance and reducing the number of API calls.

### Defining Queries

Now that we've set up our resolvers, we're ready to tie all the pieces together to define our queries. This step will enable us to perform data operations effectively within our application.

```ts twoslash collapse={7-25,31-59,65-136} import.meta.vitest name="defining-queries-1"
import { Effect, Request, RequestResolver, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// Requests
// ------------------------------

// Define a request to get multiple Todo items which might
// fail with a GetTodosError
interface GetTodos extends Request.Request<Array<Todo>, GetTodosError> {
  readonly _tag: "GetTodos"
}

// Create a tagged constructor for GetTodos requests
const GetTodos = Request.tagged<GetTodos>("GetTodos")

// Define a request to fetch a User by ID which might
// fail with a GetUserError
interface GetUserById extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

// Create a tagged constructor for GetUserById requests
const GetUserById = Request.tagged<GetUserById>("GetUserById")

// Define a request to send an email which might
// fail with a SendEmailError
interface SendEmail extends Request.Request<void, SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

// Create a tagged constructor for SendEmail requests
const SendEmail = Request.tagged<SendEmail>("SendEmail")

// ------------------------------
// Resolvers
// ------------------------------

// Assuming GetTodos cannot be batched, we create a standard resolver
const GetTodosResolver = RequestResolver.fromEffect(
  (_: Request.Entry<GetTodos>): Effect.Effect<Todo[], GetTodosError> =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/todos").then(
          (res) => res.json() as Promise<Array<Todo>>,
        ),
      catch: () => new GetTodosError(),
    }),
)

// Assuming GetUserById can be batched, we create a batched resolver
const GetUserByIdResolver = RequestResolver.make(
  (entries: ReadonlyArray<Request.Entry<GetUserById>>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/getUserByIdBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            users: entries.map(({ request }) => ({ id: request.id })),
          }),
        }).then((res) => res.json()) as Promise<Array<User>>,
      catch: () => new GetUserError(),
    }).pipe(
      Effect.andThen((users) =>
        Effect.forEach(entries, (entry, index) =>
          Request.completeEffect(entry, Effect.succeed(users[index]!)),
        ),
      ),
      Effect.catch((error) =>
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.fail(error)),
        ),
      ),
    ),
)

// Assuming SendEmail can be batched, we create a batched resolver
const SendEmailResolver = RequestResolver.make(
  (entries: ReadonlyArray<Request.Entry<SendEmail>>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/sendEmailBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emails: entries.map(({ request }) => ({
              address: request.address,
              text: request.text,
            })),
          }),
        }).then((res) => res.json() as Promise<void>),
      catch: () => new SendEmailError(),
    }).pipe(
      Effect.andThen(
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.void),
        ),
      ),
      Effect.catch((error) =>
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.fail(error)),
        ),
      ),
    ),
)

// ------------------------------
// Queries
// ------------------------------

// Defines a query to fetch all Todo items
const getTodos: Effect.Effect<Array<Todo>, GetTodosError> = Effect.request(
  GetTodos(),
  GetTodosResolver,
)

// Defines a query to fetch a user by their ID
const getUserById = (id: number) =>
  Effect.request(GetUserById({ id }), GetUserByIdResolver)

// Defines a query to send an email to a specific address
const sendEmail = (address: string, text: string) =>
  Effect.request(SendEmail({ address, text }), SendEmailResolver)

// Composes getUserById and sendEmail to send an email to a specific user
const sendEmailToUser = (id: number, message: string) =>
  getUserById(id).pipe(Effect.andThen((user) => sendEmail(user.email, message)))

// Uses getUserById to fetch the owner of a Todo and then sends them an email notification
const notifyOwner = (todo: Todo) =>
  getUserById(todo.ownerId).pipe(
    Effect.andThen((user) =>
      sendEmailToUser(user.id, `hey ${user.name} you got a todo!`),
    ),
  )

GetUserById({ id: 1 }).id // => 1
```

By using the `Effect.request` function, we integrate the resolvers with the request model effectively. This approach ensures that each query is optimally resolved using the appropriate resolver.

Although the code structure looks similar to earlier examples, employing resolvers significantly enhances efficiency by optimizing how requests are handled and reducing unnecessary API calls.

```ts {4} showLineNumbers=false
const program = Effect.gen(function* () {
  const todos = yield* getTodos
  yield* Effect.forEach(todos, (todo) => notifyOwner(todo), {
    batching: true,
  })
})
```

In the final setup, this program will execute only **3** queries to the APIs, regardless of the number of todos. This contrasts sharply with the traditional approach, which would potentially execute **1 + 2n** queries, where **n** is the number of todos. This represents a significant improvement in efficiency, especially for applications with a high volume of data interactions.

### Resolvers with Context

In complex applications, resolvers often need access to shared services or configurations to handle requests effectively. However, maintaining the ability to batch requests while providing the necessary context can be challenging. Here, we'll explore how to manage context in resolvers to ensure that batching capabilities are not compromised.

When creating request resolvers, it's crucial to manage the context carefully. Providing too much context or providing varying services to resolvers can make them incompatible for batching. To prevent such issues, the context for the resolver used in `Effect.request` is explicitly set to `never`. This forces developers to clearly define how the context is accessed and used within resolvers.

Consider the following example where we set up an HTTP service that the resolvers can use to execute API calls:

```ts twoslash collapse={7-25,31-59} import.meta.vitest name="resolvers-with-context-1"
import { Effect, Context, RequestResolver, Request, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// Requests
// ------------------------------

// Define a request to get multiple Todo items which might
// fail with a GetTodosError
interface GetTodos extends Request.Request<
  Array<Todo>,
  GetTodosError,
  HttpService
> {
  readonly _tag: "GetTodos"
}

// Create a tagged constructor for GetTodos requests
const GetTodos = Request.tagged<GetTodos>("GetTodos")

// Define a request to fetch a User by ID which might
// fail with a GetUserError
interface GetUserById extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

// Create a tagged constructor for GetUserById requests
const GetUserById = Request.tagged<GetUserById>("GetUserById")

// Define a request to send an email which might
// fail with a SendEmailError
interface SendEmail extends Request.Request<void, SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

// Create a tagged constructor for SendEmail requests
const SendEmail = Request.tagged<SendEmail>("SendEmail")

// ------------------------------
// Resolvers With Context
// ------------------------------

class HttpService extends Context.Service<
  HttpService,
  { fetch: typeof fetch }
>()("HttpService") {}

// the resolver itself must have no requirements, so we resolve HttpService
// before constructing it, and let that outer effect carry the requirement
const GetTodosResolver = Effect.map(HttpService, (http) =>
  RequestResolver.fromEffect(
    (_: Request.Entry<GetTodos>): Effect.Effect<Array<Todo>, GetTodosError> =>
      Effect.tryPromise({
        try: () =>
          http
            .fetch("https://api.example.demo/todos")
            .then((res) => res.json() as Promise<Array<Todo>>),
        catch: () => new GetTodosError(),
      }),
  ),
)

HttpService.key // => "HttpService"
```

We can see now that the type of `GetTodosResolver` is no longer a `RequestResolver` but instead it is:

```ts showLineNumbers=false
const GetTodosResolver: Effect<RequestResolver<GetTodos>, never, HttpService>
```

which is an effect that access the `HttpService` and returns a composed resolver that has the minimal context ready to use.

Once we have such effect we can directly use it in our query definition:

```ts showLineNumbers=false
const getTodos: Effect.Effect<Todo[], GetTodosError, HttpService> =
  Effect.request(GetTodos(), GetTodosResolver)
```

We can see that the Effect correctly requires `HttpService` to be provided.

Alternatively you can create `RequestResolver`s as part of layers direcly accessing or closing over context from construction.

**Example**

```ts twoslash collapse={14-32,38-66,72-92} import.meta.vitest name="resolvers-with-context-2"
import { Effect, Context, RequestResolver, Request, Layer, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// Requests
// ------------------------------

// Define a request to get multiple Todo items which might
// fail with a GetTodosError
interface GetTodos extends Request.Request<Array<Todo>, GetTodosError> {
  readonly _tag: "GetTodos"
}

// Create a tagged constructor for GetTodos requests
const GetTodos = Request.tagged<GetTodos>("GetTodos")

// Define a request to fetch a User by ID which might
// fail with a GetUserError
interface GetUserById extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

// Create a tagged constructor for GetUserById requests
const GetUserById = Request.tagged<GetUserById>("GetUserById")

// Define a request to send an email which might
// fail with a SendEmailError
interface SendEmail extends Request.Request<void, SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

// Create a tagged constructor for SendEmail requests
const SendEmail = Request.tagged<SendEmail>("SendEmail")

// ------------------------------
// Resolvers With Context
// ------------------------------

class HttpService extends Context.Service<
  HttpService,
  { fetch: typeof fetch }
>()("HttpService") {}

// the resolver itself must have no requirements, so we resolve HttpService
// before constructing it, and let that outer effect carry the requirement
const GetTodosResolver = Effect.map(HttpService, (http) =>
  RequestResolver.fromEffect(
    (_: Request.Entry<GetTodos>): Effect.Effect<Array<Todo>, GetTodosError> =>
      Effect.tryPromise({
        try: () =>
          http
            .fetch("https://api.example.demo/todos")
            .then((res) => res.json() as Promise<Array<Todo>>),
        catch: () => new GetTodosError(),
      }),
  ),
)

// ------------------------------
// Layers
// ------------------------------

class TodosService extends Context.Service<
  TodosService,
  {
    getTodos: Effect.Effect<Array<Todo>, GetTodosError>
  }
>()("TodosService") {}

const TodosServiceLive = Layer.effect(
  TodosService,
  Effect.gen(function* () {
    const http = yield* HttpService
    const resolver = RequestResolver.fromEffect((_: Request.Entry<GetTodos>) =>
      Effect.tryPromise({
        try: () =>
          http
            .fetch("https://api.example.demo/todos")
            .then<any, Todo[]>((res) => res.json()),
        catch: () => new GetTodosError(),
      }),
    )
    return {
      getTodos: Effect.request(GetTodos(), resolver),
    }
  }),
)

const getTodos: Effect.Effect<
  Array<Todo>,
  GetTodosError,
  TodosService
> = Effect.andThen(TodosService, (service) => service.getTodos)

TodosService.key // => "TodosService"
```

This way is probably the best for most of the cases given that layers are the natural primitive where to wire services together.

## Caching

While we have significantly optimized request batching, there's another area that can enhance our application's efficiency: caching. Without caching, even with optimized batch processing, the same requests could be executed multiple times, leading to unnecessary data fetching.

Caching is configured on the resolver. `RequestResolver.withCache` wraps a resolver in a bounded, in-memory cache keyed by request equality. Any query built on top of that resolver with `Effect.request` uses the same caching behavior automatically.

Here's how you can implement caching for the `getUserById` query:

```ts twoslash collapse={7-25,31-59,65-125} import.meta.vitest name="caching-1"
import { Effect, Request, RequestResolver, Data } from "effect"

// ------------------------------
// Model
// ------------------------------

interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

class GetUserError extends Data.TaggedError("GetUserError")<{}> {}

interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

class GetTodosError extends Data.TaggedError("GetTodosError")<{}> {}

class SendEmailError extends Data.TaggedError("SendEmailError")<{}> {}

// ------------------------------
// Requests
// ------------------------------

// Define a request to get multiple Todo items which might
// fail with a GetTodosError
interface GetTodos extends Request.Request<Array<Todo>, GetTodosError> {
  readonly _tag: "GetTodos"
}

// Create a tagged constructor for GetTodos requests
const GetTodos = Request.tagged<GetTodos>("GetTodos")

// Define a request to fetch a User by ID which might
// fail with a GetUserError
interface GetUserById extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

// Create a tagged constructor for GetUserById requests
const GetUserById = Request.tagged<GetUserById>("GetUserById")

// Define a request to send an email which might
// fail with a SendEmailError
interface SendEmail extends Request.Request<void, SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

// Create a tagged constructor for SendEmail requests
const SendEmail = Request.tagged<SendEmail>("SendEmail")

// ------------------------------
// Resolvers
// ------------------------------

// Assuming GetTodos cannot be batched, we create a standard resolver
const GetTodosResolver = RequestResolver.fromEffect(
  (_: Request.Entry<GetTodos>): Effect.Effect<Todo[], GetTodosError> =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/todos").then(
          (res) => res.json() as Promise<Array<Todo>>,
        ),
      catch: () => new GetTodosError(),
    }),
)

// Assuming GetUserById can be batched, we create a batched resolver
const GetUserByIdResolver = RequestResolver.make(
  (entries: ReadonlyArray<Request.Entry<GetUserById>>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/getUserByIdBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            users: entries.map(({ request }) => ({ id: request.id })),
          }),
        }).then((res) => res.json()) as Promise<Array<User>>,
      catch: () => new GetUserError(),
    }).pipe(
      Effect.andThen((users) =>
        Effect.forEach(entries, (entry, index) =>
          Request.completeEffect(entry, Effect.succeed(users[index]!)),
        ),
      ),
      Effect.catch((error) =>
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.fail(error)),
        ),
      ),
    ),
)

// Assuming SendEmail can be batched, we create a batched resolver
const SendEmailResolver = RequestResolver.make(
  (entries: ReadonlyArray<Request.Entry<SendEmail>>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/sendEmailBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emails: entries.map(({ request }) => ({
              address: request.address,
              text: request.text,
            })),
          }),
        }).then((res) => res.json() as Promise<void>),
      catch: () => new SendEmailError(),
    }).pipe(
      Effect.andThen(
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.void),
        ),
      ),
      Effect.catch((error) =>
        Effect.forEach(entries, (entry) =>
          Request.completeEffect(entry, Effect.fail(error)),
        ),
      ),
    ),
)

// ------------------------------
// Caching
// ------------------------------

// Wrap the resolver in a bounded, in-memory cache keyed by request equality.
// Build it once and reuse the resulting resolver for every call.
const cachedGetUserByIdResolver = Effect.runSync(
  RequestResolver.withCache(GetUserByIdResolver, { capacity: 256 }),
)

const getUserById = (id: number) =>
  Effect.request(GetUserById({ id }), cachedGetUserByIdResolver)

cachedGetUserByIdResolver === GetUserByIdResolver // => false
```

## Final Program

Assuming you've wired everything up correctly:

```ts showLineNumbers=false
const program = Effect.gen(function* () {
  const todos = yield* getTodos
  yield* Effect.forEach(todos, (todo) => notifyOwner(todo), {
    concurrency: "unbounded",
  })
}).pipe(Effect.repeat(Schedule.fixed("10 seconds")))
```

With this program, the `getTodos` operation retrieves the todos for each user. Then, the `Effect.forEach` function is used to notify the owner of each todo concurrently, without waiting for the notifications to complete.

The `repeat` function is applied to the entire chain of operations, and it ensures that the program repeats every 10 seconds using a fixed schedule. This means that the entire process, including fetching todos and sending notifications, will be executed repeatedly with a 10-second interval.

Since `getUserById` is built on top of `cachedGetUserByIdResolver`, the program reuses cached results for a `GetUserById` request as long as its resolver's cache hasn't evicted it (bounded by the `capacity` given to `RequestResolver.withCache`), reducing unnecessary requests to fetch user data.

Furthermore, the program is designed to send emails in batches, allowing for efficient processing and better utilization of resources.

## Customizing Request Caching

`RequestResolver.withCache` takes a `strategy` option (`"lru"`, the default, or `"fifo"`) controlling which entry is evicted once the cache reaches `capacity`:

```ts showLineNumbers=false
const fifoCachedResolver = Effect.runSync(
  RequestResolver.withCache(GetUserByIdResolver, {
    capacity: 256,
    strategy: "fifo",
  }),
)
```

Cache entries created this way don't expire by time. If you need time-to-live-based expiry, or want cache lookups exposed as a first-class `Cache` (with `get`/`refresh`/`invalidate`, see [Cache](/docs/v4/caching/cache/)) instead of a plain `RequestResolver`, use [`RequestResolver.asCache`](/docs/v4/api/effect/RequestResolver) instead. It accepts the same `capacity` option plus an optional `timeToLive`.
