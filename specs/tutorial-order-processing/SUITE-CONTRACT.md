# Order-Processing Tutorial Reference Contract

This contract is the preferred architectural reference for tutorials that use
the order-processing domain. It prevents drift when examples reuse the same
names and models without requiring every current or future tutorial to use this
scenario.

## Canonical model

```ts
interface OrderLine {
  readonly sku: string
  readonly quantity: number
}

interface QuoteRequest {
  readonly items: ReadonlyArray<OrderLine>
  readonly postalCode: string
}

interface PlaceOrderRequest extends QuoteRequest {
  readonly customerId: string
  readonly paymentToken: string
}

interface AcceptedOrder {
  readonly orderId: OrderId
  readonly acceptedAt: Date
  readonly labels: ReadonlySet<string>
  readonly status: "accepted"
  readonly totalCents: number
  readonly paymentProvider: string
}
```

The application generates `OrderId`. A public place-order request never asks
the caller to choose it. `paymentToken` is opaque and never appears in logs,
traces, or responses.

## Canonical operations

- `quoteOrder` prices Order Lines and shipping while preserving line order.
- `placeOrder` calculates a Quote, reserves inventory, authorizes payment, and
  stores the Accepted Order.
- `importOrders` validates and imports records identified by External Order ID.

An Order becomes accepted only after every `placeOrder` stage succeeds.

## HTTP routes

- `POST /quotes` runs `quoteOrder`.
- `POST /orders` runs `placeOrder`.
- `POST /orders/import` runs `importOrders`.
- `GET /health` reports process availability.

HTTP owns request decoding, response encoding, status selection, and forwarding
client cancellation. Application operations do not return HTTP response types.

## Service boundaries

The integrated reference application uses these service names and meanings:

- `Catalog` prices individual Order Lines.
- `Shipping` quotes delivery to a postal code.
- `Inventory` reserves stock for an Order.
- `Payment` authorizes payment through a provider.
- `OrderRepository` stores and retrieves Orders.

Database connections and inventory locks are infrastructure resources, not
domain values. Promise-based SDKs are adapted inside infrastructure
implementations rather than exposed to application operations.

## Expected failures

- `InvalidOrder` means external data did not satisfy the boundary contract.
- `QuoteTimedOut` means the complete Quote exceeded its deadline.
- `InventoryUnavailable` means the requested stock could not be reserved.
- `PaymentDeclined` means the provider rejected the payment permanently.
- `PaymentProviderUnavailable` means the provider may recover on another
  attempt.
- `OrderStorageError` means the Order could not be stored.

Client cancellation interrupts the complete operation. It is not translated
into one of these expected failures.

## Architectural boundaries

- The HTTP boundary decodes, runs, translates, and encodes.
- Application operations express business sequencing and policies.
- Service contracts expose Effect operations and expected failures.
- Infrastructure Layers adapt external SDKs and own resources.
- The application runtime builds shared Layers once and disposes them during
  shutdown.
- Tracing follows named operations without changing their contracts.
- Effect-aware diagnostics are a development quality gate, not runtime logic.

## Reusing the reference scenario

A tutorial may choose a different scenario when it better supports the
learning outcome. When a tutorial uses order processing, it may omit fields,
services, and files unrelated to its lesson. The fixture supplies those omitted
details, and the reduced model preserves the canonical meaning of every term it
keeps.

- Error handling isolates the Payment call and payment policy.
- Structured concurrency isolates `quoteOrder`, Catalog, and Shipping.
- Resource management isolates the infrastructure used by Inventory and
  OrderRepository after an Order ID has been generated.
- Schema isolates rich domain values from derived and explicitly defined JSON
  representations.
- Dependency injection isolates service contracts, Layers, and the application
  runtime.
- AI diagnostics isolates `importOrders` and the development feedback loop.
- Tracing observes the complete `placeOrder` flow.

Do not introduce an Effect API merely to resemble the reference application.
When integration fidelity would obscure the lesson, keep the tutorial simple
and use a fixture that satisfies the shared boundary.
