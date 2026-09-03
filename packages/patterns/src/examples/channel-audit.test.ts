import assert from "node:assert/strict";
import { test } from "node:test";
import { getExample, listExamples } from "../../dist/index.mjs";

test("example channels stay fully connected and scenario ids resolve", () => {
  const problems: string[] = [];

  for (const meta of listExamples()) {
    const doc = getExample(meta.id);
    const graph = doc.graph;
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const connected = new Set<string>();
    const channelIds = new Set<string>();

    for (const ch of graph.channels) {
      channelIds.add(ch.id);
      if (!nodeIds.has(ch.source)) problems.push(`${meta.id}: channel ${ch.id} source ${ch.source} missing`);
      if (!nodeIds.has(ch.target)) problems.push(`${meta.id}: channel ${ch.id} target ${ch.target} missing`);
      connected.add(ch.source);
      connected.add(ch.target);
    }

    for (const id of nodeIds) {
      if (!connected.has(id)) problems.push(`${meta.id}: isolated node ${id}`);
    }

    const queues = graph.nodes.filter((n) => n.kind === "queue").map((n) => n.id);
    for (const q of queues) {
      const incoming = graph.channels.some((c) => c.target === q);
      const outgoing = graph.channels.some((c) => c.source === q);
      if (!incoming) problems.push(`${meta.id}: queue ${q} has no producer`);
      if (!outgoing) problems.push(`${meta.id}: queue ${q} has no consumer`);
    }

    const seenPos = new Set<string>();
    for (const n of graph.nodes) {
      if (!n.position) {
        problems.push(`${meta.id}: node ${n.id} has no position`);
        continue;
      }
      const key = `${n.position.x},${n.position.y}`;
      if (seenPos.has(key)) problems.push(`${meta.id}: overlapping position at ${key} (${n.id})`);
      seenPos.add(key);
    }

    if (meta.id === "donations-website") {
      const payment = graph.nodes.find((n) => n.id === "PaymentService")?.position;
      const receipt = graph.nodes.find((n) => n.id === "ReceiptService")?.position;
      if (payment && receipt && receipt.x <= payment.x) {
        problems.push("donations-website: ReceiptService should sit to the right of PaymentService");
      }
    }

    for (const scenario of doc.scenarios) {
      for (const step of scenario.steps) {
        for (const p of step.primitives) {
          if (p.kind === "emit" && !channelIds.has(p.channelId)) {
            problems.push(`${meta.id}: scenario ${scenario.id} unknown channel ${p.channelId}`);
          }
        }
      }
    }
  }

  assert.deepEqual(problems, []);
});
