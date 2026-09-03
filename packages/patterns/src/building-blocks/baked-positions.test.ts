import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  columnPositions,
  hubPositions,
  sideBranchPositions,
} from "./baked-positions.ts";

describe("columnPositions", () => {
  it("places ranks left to right and centers shorter columns", () => {
    const pos = columnPositions([
      ["Client"],
      ["Gateway"],
      ["ServiceA", "ServiceB"],
      ["DB"],
    ]);
    assert.equal(pos.Client!.x < pos.Gateway!.x, true);
    assert.equal(pos.Gateway!.x < pos.ServiceA!.x, true);
    assert.equal(pos.ServiceA!.x, pos.ServiceB!.x);
    assert.equal(pos.ServiceA!.y < pos.ServiceB!.y, true);
    assert.equal(pos.Gateway!.y, (pos.ServiceA!.y + pos.ServiceB!.y) / 2);
    assert.equal(pos.DB!.x > pos.ServiceA!.x, true);
  });
});

describe("hubPositions", () => {
  it("stacks actors on the left instead of spreading them horizontally", () => {
    const pos = hubPositions({
      left: ["Customer", "Driver"],
      hub: "Gateway",
      spokes: ["Orders", "Dispatch"],
      right: ["DB", "Queue"],
    });
    assert.equal(pos.Customer!.x, pos.Driver!.x);
    assert.equal(pos.Customer!.y < pos.Driver!.y, true);
    assert.equal(pos.Gateway!.x > pos.Customer!.x, true);
    assert.equal(pos.Orders!.x > pos.Gateway!.x, true);
    assert.equal(pos.DB!.x > pos.Orders!.x, true);
    assert.equal(pos.DB!.x, pos.Queue!.x);
  });
});

describe("sideBranchPositions", () => {
  it("fans out to the right of the anchor", () => {
    const pos = sideBranchPositions({ x: 100, y: 200 }, ["Redis", "DB"]);
    assert.equal(pos.Redis!.x, 340);
    assert.equal(pos.DB!.x, 340);
    assert.equal(pos.Redis!.y < pos.DB!.y, true);
    assert.equal((pos.Redis!.y + pos.DB!.y) / 2, 200);
  });
});
