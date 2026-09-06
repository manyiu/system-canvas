import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CustomPatternDefinition } from "../../dist/index.mjs";
import { expandPattern } from "../../dist/index.mjs";

const backoff: CustomPatternDefinition = {
  id: "ExponentialBackoff",
  name: "ExponentialBackoff",
  params: [{ name: "maxRetries", defaultValue: 3 }],
  handlers: [
    {
      event: "Request",
      payloadBinding: "payload",
      body: [
        {
          kind: "invoke",
          target: "target",
          method: "process",
          payloadBinding: "payload",
          onFailure: [
            {
              kind: "if",
              condition: {
                kind: "compare",
                op: "<",
                left: { kind: "ref", path: ["context", "attempt"] },
                right: { kind: "ref", path: ["maxRetries"] },
              },
              then: [
                {
                  kind: "hold",
                  payloadBinding: "payload",
                  durationMs: 1000,
                  label: "Backoff",
                },
                { kind: "retry" },
              ],
              else: [
                {
                  kind: "emit",
                  payloadType: "DeadLetter",
                  payloadBinding: "payload",
                  target: "DLQ",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("expandPattern", () => {
  it("unrolls fail/fail/ok into attempt + backoff + success steps", () => {
    const steps = expandPattern(backoff, {
      sourceNodeId: "Gateway",
      bindings: { target: "PaymentService", DLQ: "DLQ" },
      channelId: "ch_req",
      dlqChannelId: "ch_dlq",
      event: "Request",
      outcomes: ["fail", "fail", "ok"],
    });

    const names = steps.map((s) => s.name);
    assert.deepEqual(names, ["Attempt 1", "Backoff", "Attempt 2", "Backoff", "Attempt 3"]);
    assert.equal(
      steps[0]?.primitives.some((p) => p.kind === "emit"),
      true,
    );
    assert.equal(steps[1]?.visuals?.[0]?.kind, "hold");
    assert.equal(
      steps[4]?.visuals?.some((v) => v.color === "green"),
      true,
    );
  });

  it("emits DeadLetter when attempts exhaust with failures", () => {
    const steps = expandPattern(backoff, {
      sourceNodeId: "Gateway",
      bindings: { target: "PaymentService", DLQ: "DLQ" },
      channelId: "ch_req",
      dlqChannelId: "ch_dlq",
      event: "Request",
      outcomes: ["fail", "fail", "fail"],
    });

    const last = steps[steps.length - 1];
    assert.equal(last?.name, "Emit DeadLetter");
    const emit = last?.primitives.find((p) => p.kind === "emit");
    assert.equal(emit?.kind, "emit");
    if (emit?.kind === "emit") {
      assert.equal(emit.payload.type, "DeadLetter");
      assert.equal(emit.channelId, "ch_dlq");
    }
  });

  it("uses the invoke payload id on hold visuals", () => {
    const steps = expandPattern(backoff, {
      sourceNodeId: "Gateway",
      bindings: { target: "PaymentService", DLQ: "DLQ" },
      channelId: "ch_req",
      dlqChannelId: "ch_dlq",
      event: "Request",
      outcomes: ["fail", "ok"],
    });

    const attemptEmit = steps[0]?.primitives.find((p) => p.kind === "emit");
    const hold = steps[1]?.visuals?.find((v) => v.kind === "hold");
    assert.equal(attemptEmit?.kind, "emit");
    assert.ok(hold);
    if (attemptEmit?.kind === "emit") {
      assert.equal(hold?.payloadId, attemptEmit.payload.id);
      assert.notEqual(hold?.payloadId, "payload");
    }
  });

  it("throws when DeadLetter emit lacks dlqChannel", () => {
    assert.throws(
      () =>
        expandPattern(backoff, {
          sourceNodeId: "Gateway",
          bindings: { target: "PaymentService", DLQ: "DLQ" },
          channelId: "ch_req",
          event: "Request",
          outcomes: ["fail", "fail", "fail"],
        }),
      /dlqChannel/,
    );
  });

  it("throws when outcomes end while retry is pending", () => {
    assert.throws(
      () =>
        expandPattern(backoff, {
          sourceNodeId: "Gateway",
          bindings: { target: "PaymentService", DLQ: "DLQ" },
          channelId: "ch_req",
          dlqChannelId: "ch_dlq",
          event: "Request",
          outcomes: ["fail"],
        }),
      /retry\(\) was pending/,
    );
  });

  it("throws on empty outcomes", () => {
    assert.throws(
      () =>
        expandPattern(backoff, {
          sourceNodeId: "Gateway",
          bindings: { target: "PaymentService", DLQ: "DLQ" },
          channelId: "ch_req",
          dlqChannelId: "ch_dlq",
          event: "Request",
          outcomes: [],
        }),
      /non-empty/,
    );
  });
});
