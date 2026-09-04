import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createExecutor } from "../../core/dist/index.mjs";
import { parseDsl, serializeDsl } from "../dist/index.mjs";

const BACKOFF_DSL = `system BackoffDemo v1 {
  gateway Gateway { icon: "api-gateway" }
  service PaymentService { icon: "microservice" }
  queue DLQ { icon: "sqs" }

  channel ch_req Gateway -> PaymentService { delivery: "sync" label: "process" }
  channel ch_dlq PaymentService -> DLQ { delivery: "async" label: "dead letter" }

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
}`;

describe("pattern DSL", () => {
  it("parses pattern definitions and expands apply into linear steps", () => {
    const doc = parseDsl(BACKOFF_DSL);
    assert.equal(doc.patterns?.length, 1);
    assert.equal(doc.patterns?.[0]?.name, "ExponentialBackoff");

    const steps = doc.scenarios[0]?.steps ?? [];
    assert.deepEqual(
      steps.map((s) => s.name),
      ["Attempt 1", "Backoff", "Attempt 2", "Backoff", "Attempt 3"],
    );
  });

  it("executes expanded steps without runtime retry jumps", () => {
    const doc = parseDsl(BACKOFF_DSL);
    const scenario = doc.scenarios[0]!;
    const executor = createExecutor();

    for (let i = 0; i < scenario.steps.length; i++) {
      const result = executor.executeStep(doc.graph, scenario, i);
      assert.equal(result.snapshot?.stepIndex, i);
    }

    const last = executor.executeStep(
      doc.graph,
      scenario,
      scenario.steps.length - 1,
    );
    assert.equal(last.snapshot?.nodeStates.Gateway?.lastOutcome, "ok");
  });

  it("round-trips pattern definitions through serialize", () => {
    const doc = parseDsl(BACKOFF_DSL);
    const text = serializeDsl(doc);
    assert.match(text, /pattern ExponentialBackoff/);
    assert.match(text, /onEvent Request\(payload\)/);
    assert.match(text, /visual\.hold/);
    // apply expands at parse time — serialize emits linear steps, not apply
    assert.doesNotMatch(text, /\bapply\b/);
    assert.match(text, /step "Attempt 1"/);

    const again = parseDsl(text);
    assert.equal(again.patterns?.[0]?.handlers[0]?.event, "Request");
  });

  it("rejects duplicate pattern definitions", () => {
    assert.throws(
      () =>
        parseDsl(`system Dup v1 {
  service A {}
  pattern Foo {
    onEvent Request(payload) { retry() }
  }
  pattern Foo {
    onEvent Request(payload) { retry() }
  }
  scenario "s" {
    step "x" { mutate A { ok: true } }
  }
}`),
      /Duplicate pattern/,
    );
  });
});
