# Tutorial architecture map visualization research

Date: 2026-08-10

## Decision to make

The documentation needs two related but distinct visual answers:

1. What is the stable structure of the shared order-processing system?
2. What happens during the specific behavior discussed by a tutorial?

These should not be encoded as one ambiguous diagram.

## Findings from recognized conventions

### Separate static structure from runtime behavior

C4 defines context, container, component, and code diagrams as static structure views. A dynamic diagram is a supporting view that shows how elements from that model collaborate during a specific story or use case, using ordered interactions. [C4 diagrams](https://c4model.com/diagrams), [C4 dynamic diagram](https://c4model.com/diagrams/dynamic)

Structurizr applies the same separation: a dynamic view is built from ordered instances of relationships already present in the static model. [Structurizr dynamic view](https://docs.structurizr.com/dsl/cookbook/dynamic-view/)

### Keep one model and derive focused views

Structurizr filtered views are views on top of one static base view. The important property for this project is that filtered views share element and relationship positions. This preserves spatial memory while different tutorials reveal different parts of the architecture. [Structurizr filtered view](https://docs.structurizr.com/ui/diagrams/filtered-view)

### Relationships need precise visual semantics

C4 recommends that every relationship be unidirectional and labelled with its intent. The diagram should also explain its scope and any meaning assigned to colors, shapes, borders, or line styles. [C4 notation](https://c4model.com/diagrams/notation), [C4 review checklist](https://c4model.com/diagrams/checklist)

Microsoft's architecture diagram guidance reaches the same conclusion: use directional arrows, avoid ambiguous bidirectional relationships, label elements and relationships, maintain one consistent taxonomy, include a legend when line or border styles carry meaning, and use progressive disclosure instead of overloading one diagram. [Azure Well-Architected diagram guidance](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/design-diagrams)

### A professional look comes from a constrained grammar

Structurizr deliberately uses a limited vocabulary of boxes, boundaries, and unidirectional arrows, with styles applied consistently across views. [Structurizr notation](https://docs.structurizr.com/server/diagrams/notation)

Mermaid's architecture diagrams use the same basic primitives: groups, services, edges, and junctions. Its implementation is aimed mainly at cloud and CI/CD layouts, so it is a useful layout reference rather than a better conceptual model for this application. [Mermaid architecture diagrams](https://mermaid.js.org/syntax/architecture)

## Audit of the current component

The current `TutorialArchitectureMap` presents five rows as layers and inserts one unlabelled down arrow between rows. This creates several semantic problems:

- The arrow appears to say that every node in one row sends information to every node in the next.
- `Application-wide support` appears to be the final stage of a runtime request even though tracing is cross-cutting and development tools act before runtime.
- `Domain model`, application operations, external clients, runtime services, and build-time tools are shown at mixed levels of abstraction.
- Nodes record tutorial membership, but the model does not define actual relationships between nodes. Highlighting therefore communicates impact, not flow.
- The compact rendering reduces the full map instead of providing a focused view, creating many small boxes with little explanatory value.

The first fix is semantic: remove arrows between group containers and introduce explicit, labelled relationships between actual elements.

## Visual directions

### 1. C4 spotlight - recommended foundation

Use one stable left-to-right structural map:

- `Clients` outside the application boundary.
- `Order application` as an explicit boundary.
- Inside it, aligned columns for `HTTP routes`, `Application operations`, and service contracts or repositories.
- External providers and storage outside or at the far edge of that boundary, according to ownership.
- Tracing as a cross-cutting rail or backdrop, not another runtime stage.
- Development tools in a separate `Development time` band, visually distinct from runtime.

Draw only real relationships, with orthogonal one-way arrows and short verb labels. Use neutral surfaces for the architecture and one strong tutorial accent for selected nodes and edges. Pair the color with a thicker edge or focus ring so color is not the only signal.

The Introduction page shows the complete structural view. Selecting a tutorial produces a Structurizr-style filtered view with identical node positions, selected nodes and relationships emphasized, immediate context quiet but legible, and unrelated areas hidden or strongly de-emphasized.

Why it fits: it is professional, stable across all seven tutorials, and preserves the reader's spatial memory.

### 2. Structure plus dynamic story - recommended when runtime flow matters

Keep the structural spotlight for `Where this tutorial fits`, then add a separate compact dynamic strip only when the lesson depends on order, branching, or cleanup:

`1 Request -> 2 Place order -> 3 Authorize payment -> 4 HTTP response`

Use numbered interactions, short active labels, and deliberate branch/join shapes for concurrency. A cleanup or compensation action can return on a separate labelled path. Never reuse this grammar for dependency injection or development tooling, because those are not request flows.

This direction is especially useful for failure handling, concurrency, cleanup, serialization, and tracing. It should be used sparingly, consistent with C4 guidance.

Why it fits: it makes information flow unmistakable without corrupting the architecture map.

### 3. Tutorial focus strip - cleanest compact alternative

Replace the per-tutorial miniature map with a horizontal strip of only the affected elements. Each item shows its architectural group above the component name, and labelled arrows connect only real relationships. A small locator or link opens the full architecture.

This is visually lightweight and works well in article flow. It is less standard than a filtered structural view and loses some spatial memory, so it should be chosen only if compactness matters more than continuity with the overview.

Why it fits: it is the most visually minimal option, but not the strongest architecture-navigation model.

## Recommendation

Adopt direction 1 as the shared visual system and direction 2 only for tutorials whose lesson includes meaningful runtime behavior.

The resulting grammar is simple:

- Structural map answers: `Where does this concern live?`
- Dynamic story answers: `What happens, and in what order?`
- Solid directional arrows always mean real runtime or dependency relationships.
- Cross-cutting and development-time concerns use labelled bands, never flow arrows.
- Node positions, names, shapes, and colors remain stable across the complete and filtered views.

This is more credible than making the existing card grid more decorative. The professional quality comes first from truthful semantics, stable layout, whitespace, consistent typography, precise arrow routing, and restrained color.
