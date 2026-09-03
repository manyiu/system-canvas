import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveChannelHandles } from "./resolve-handles.ts";

describe("resolveChannelHandles", () => {
  it("defaults to right -> left for horizontal LR flow", () => {
    const handles = resolveChannelHandles(
      { position: { x: 0, y: 100 } },
      { position: { x: 300, y: 100 } },
    );
    assert.deepEqual(handles, { sourceHandle: "right", targetHandle: "left" });
  });

  it("uses bottom -> top when target is below", () => {
    const handles = resolveChannelHandles(
      { position: { x: 200, y: 100 } },
      { position: { x: 280, y: 280 } },
    );
    assert.deepEqual(handles, { sourceHandle: "bottom", targetHandle: "top" });
  });

  it("uses top -> bottom when target is above", () => {
    const handles = resolveChannelHandles(
      { position: { x: 200, y: 280 } },
      { position: { x: 280, y: 100 } },
    );
    assert.deepEqual(handles, { sourceHandle: "top", targetHandle: "bottom" });
  });

  it("uses left -> right for back-edges", () => {
    const handles = resolveChannelHandles(
      { position: { x: 400, y: 100 } },
      { position: { x: 100, y: 100 } },
    );
    assert.deepEqual(handles, { sourceHandle: "left", targetHandle: "right" });
  });

  it("uses left -> right when target is down and to the left (donations ReceiptService)", () => {
    const handles = resolveChannelHandles(
      { position: { x: 480, y: 160 } },
      { position: { x: 40, y: 400 } },
    );
    assert.deepEqual(handles, { sourceHandle: "left", targetHandle: "right" });
  });

  it("respects explicit overrides", () => {
    const handles = resolveChannelHandles(
      { position: { x: 0, y: 0 } },
      { position: { x: 300, y: 0 } },
      { sourceHandle: "bottom", targetHandle: "top" },
    );
    assert.deepEqual(handles, { sourceHandle: "bottom", targetHandle: "top" });
  });
});
