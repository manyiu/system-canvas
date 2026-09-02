# System Canvas

Interactive visualization for distributed system architecture, data flow, and interaction patterns — Outbox, CDC, Saga, Circuit Breaker, CQRS, and more.

## Vision

System Canvas helps architects and engineers **see** how distributed patterns work. Define topology and execution scenarios in a declarative DSL or a drag-and-drop React Flow canvas with **bidirectional sync**, then scrub through step-by-step visual highlights (full animation in Step 3).

## Architecture

```
DSL text / Pattern templates
        ↓
   SystemDocument (AST)
   ├── SystemGraph (nodes + channels)
   └── Scenario (steps → primitives + visuals)
        ↓
   Execution Engine (Step 3) → React Flow Canvas (Step 2)
```

### Packages

| Package | Description |
| --- | --- |
| `@system-canvas/core` | AST types, primitives, visual directives, engine/timeline stubs |
| `@system-canvas/dsl` | Peggy parser + compiler (`parseDsl()`, `serializeDsl()`) |
| `@system-canvas/patterns` | 10 built-in pattern templates + custom pattern POC |
| `@system-canvas/ui` | React Flow canvas, adapters, visual directive styling |
| `@system-canvas/app` | Vite demo — split-pane DSL + canvas editor |

### Three layers

| Layer | What it is | Example |
| --- | --- | --- |
| Surface syntax | What you write | `OrderService -> DB: Write Order` |
| AST | Shared data model | `SystemDocument`, `ExecutionStep` |
| Primitives | What the engine runs | `emit`, `mutate`, `gate`, `delay` |

## Tech Stack

| Layer | Choice | Version |
| --- | --- | --- |
| Runtime | Node.js LTS | 24.20.0 |
| Package manager | pnpm | 12.2.1 |
| Monorepo | Turborepo | 2.10.12 |
| Language | TypeScript | 7.0.2 |
| DSL parser | Peggy | 5.1.0 |
| Bundler | tsdown | 0.22.14 |
| Canvas (Step 2) | @xyflow/react | 12.11.6 |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the demo app (DSL + canvas split pane)
pnpm dev:app

# Run Playwright e2e tests (starts dev server automatically)
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

### Load a built-in pattern

```typescript
import { getPattern, listPatterns } from "@system-canvas/patterns";

const outbox = getPattern("outbox");
const all = listPatterns(); // 10 built-in + exponential-backoff POC
```

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

### Keywords

| Keyword | Meaning |
| --- | --- |
| `system Name v1` | Whole architecture document |
| `service` / `queue` / `database` | Node types on the canvas |
| `port Node.port` | Sub-component (e.g. outbox table) |
| `scenario "..."` | Simulation script |
| `step "..."` | One timeline frame |

## Built-in Patterns

### Data Consistency & Messaging
- `outbox` — Transactional Outbox
- `cdc` — Change Data Capture
- `saga-orchestration` — Saga (Orchestration)
- `saga-choreography` — Saga (Choreography)
- `two-phase-commit` — Two-Phase Commit

### Resilience & Fault Tolerance
- `circuit-breaker` — Circuit Breaker

### Traffic & Data Distribution
- `rate-limiting` — Token Bucket Rate Limiting
- `read-through-cache` — Read-Through Cache
- `write-through-cache` — Write-Through Cache
- `cqrs` — CQRS

### Custom (POC)
- `exponential-backoff` — Retry with exponential backoff → DLQ

## Roadmap

| Step | Scope |
| --- | --- |
| **Step 1** | Monorepo, AST, DSL parser, pattern library |
| **Step 2** (current) | React Flow UI, Vite demo, bidirectional DSL ↔ canvas sync |
| **Step 3** | Execution engine + timeline scrubber + payload animation |
| **Step 4** | Custom pattern behavioral DSL (`pattern { onEvent ... }`) |

## License

MIT
