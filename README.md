# System Canvas

Interactive visualization for distributed system architecture, data flow, and interaction patterns — Outbox, CDC, Saga, Circuit Breaker, CQRS, and more.

**Live demo:** [https://system-canvas.vazue.com](https://system-canvas.vazue.com)

## Vision

System Canvas helps architects and engineers **see** how distributed patterns work. Define topology and execution scenarios in a declarative DSL or a drag-and-drop React Flow canvas with **bidirectional sync**, then play or scrub through step-by-step visual highlights and payload packets on channels.

## Architecture

```
DSL text / Pattern templates / Custom pattern DSL
        ↓
   SystemDocument (AST)
   ├── SystemGraph (nodes + channels)
   ├── patterns? (CustomPatternDefinition)
   └── Scenario (steps → primitives + visuals)
        ↓
   expandPattern (Step 4) → linear steps
        ↓
   Execution Engine (Step 3) → React Flow Canvas (Step 2)
```

### Packages

| Package | Description |
| --- | --- |
| `@system-canvas/core` | AST types, primitives, visual directives, executor + timeline |
| `@system-canvas/dsl` | Peggy parser + compiler (`parseDsl()`, `serializeDsl()`) |
| `@system-canvas/patterns` | Example catalog + custom pattern demos (Exponential Backoff) |
| `@system-canvas/ui` | React Flow canvas, adapters, visual directive styling |
| `@system-canvas/app` | Vite demo — split-pane DSL + canvas editor |

### Three layers

| Layer | What it is | Example |
| --- | --- | --- |
| Surface syntax | What you write | `OrderService -> DB: Write Order` |
| AST | Shared data model | `SystemDocument`, `ExecutionStep` |
| Primitives | What the engine runs | `emit`, `mutate`, `gate`, `delay` |

## Tech Stack

| Layer | Choice | Version / notes |
| --- | --- | --- |
| Runtime | Node.js | `>=24.20.0` |
| Package manager | pnpm | `12.2.1` |
| Monorepo | Turborepo | `2.10.12` |
| Language | TypeScript | `7.0.2` (strict) |
| UI | React | `19.x` |
| App bundler | Vite | `8.x` |
| State | Zustand | `5.x` |
| Editor | Monaco Editor | via `@monaco-editor/react` |
| Canvas | `@xyflow/react` + dagre | `12.x` |
| DSL parser | Peggy | `5.1.0` |
| Library bundler | tsdown | `0.22.14` |
| Format / lint | Biome | monorepo-wide |
| Unit tests | Node.js test runner | — |
| E2E | Playwright | `1.55.0` |
| Hosting | Amazon S3 + CloudFront | private origin, OAC, HTTPS |
| DNS / TLS | Route 53 + ACM | `system-canvas.vazue.com` |
| IaC | AWS CDK (TypeScript) | see [`infra/`](infra/) |
| CI / CD | GitHub Actions + OIDC | trunk-based deploy from `main` |

## Quick Start

```bash
# Install dependencies
pnpm install

# Format + lint (Biome)
pnpm check

# Build all packages
pnpm build

# Run the demo app (DSL + canvas split pane)
pnpm dev:app

# Unit tests
pnpm test:unit

# Playwright e2e (starts the dev server automatically)
pnpm test:e2e
```

Open [http://localhost:5173](http://localhost:5173) to use the editor.

### Parse DSL

```typescript
import { parseDsl } from "@system-canvas/dsl";

const doc = parseDsl(`
system OrderFlow v1 {
  service OrderService { icon: "microservice" }
  database DB { icon: "postgres" }

  scenario "Happy Path" {
    step "Place Order" {
      OrderService -> DB: Write Order
    }
  }
}
`);

console.log(doc.graph.nodes);   // [{ id: "OrderService", ... }, ...]
console.log(doc.scenarios[0].steps[0].primitives); // compiled emit/mutate primitives
```

### Load a built-in example

```typescript
import { getExample, listExamples } from "@system-canvas/patterns";

const bitly = getExample("bitly");
const all = listExamples();
```

## Example Catalog

Examples are grouped by difficulty in the **Examples** menu (easy / medium / hard / more practice), covering common system-design topologies with step-by-step playback.

## DSL Cheat Sheet

`system OrderFlow v1` is the **entire diagram title** — not a microservice.

```
system OrderFlow v1 {

  // Topology: declare boxes
  service OrderService { icon: "microservice" }
  queue Kafka          { icon: "kafka", topic: "order-events" }
  database DB          { icon: "postgres" }
  port DB.outbox { label: "Outbox Table" }

  // Behavior: animate data flow
  scenario "Outbox Pattern Execution" {
    step "Place Order" {
      OrderService -> DB: Write Order + Outbox Record
        annotations: [Transaction]
    }

    step "CDC Dispatch" [pattern: cdc] {
      DB.outbox -> Kafka: Publish "OrderCreated" event
      animate payload: { orderId: 101, status: "PENDING" }
    }
  }
}
```

Custom pattern definitions expand at parse time into linear steps (retries are unrolled; invoke outcomes are scripted). `apply` is compile-time only — `serializeDsl` writes the expanded steps (and keeps `pattern` definitions), not the original `apply` block.

```
pattern ExponentialBackoff {
  param maxRetries = 3
  onEvent Request(payload) {
    invoke target.process(payload) {
      onFailure {
        if (context.attempt < maxRetries) {
          visual.hold(payload, duration: 1000, label: "Backoff")
          retry()
        } else {
          emit DeadLetter(payload) -> DLQ
        }
      }
    }
  }
}

scenario "Retry then succeed" {
  apply ExponentialBackoff {
    source: Gateway
    target: PaymentService
    channel: ch_req
    dlqChannel: ch_dlq
    DLQ: DLQ
    event: Request
    outcomes: [fail, fail, ok]
  }
}
```

### Keywords

| Keyword | Meaning |
| --- | --- |
| `system Name v1` | Whole architecture document |
| `service` / `queue` / `database` | Node types on the canvas |
| `port Node.port` | Sub-component (e.g. token bucket on gateway) |
| `scenario "..."` | Simulation script |
| `step "..."` | One timeline frame |
| `pattern Name { … }` | Custom pattern definition (`onEvent`, `retry`, …) |
| `apply Pattern { … }` | Expand a pattern into linear steps (scripted outcomes) |
| `[pattern: id]` | Optional tag on a hand-written step (not a definition) |

## Deploy

Production hosting is defined in [`infra/`](infra/) (AWS CDK). Continuous deploy uses GitHub Actions with OIDC on `main`. See [`infra/README.md`](infra/README.md) for operator bootstrap.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Security reports: [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE)
