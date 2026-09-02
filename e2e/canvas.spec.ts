import { expect, test, type Locator, type Page } from "@playwright/test";

const OUTBOX_NODES = ["OrderService", "DB", "Poller", "Kafka"];
const CIRCUIT_BREAKER_NODES = ["Client", "Gateway", "Service"];

async function expectNodeInCanvas(canvas: Locator, nodeId: string) {
  const node = canvas.locator(`.react-flow__node[data-id="${nodeId}"]`);
  await expect(node).toHaveCount(1);

  const box = await node.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
}

async function waitForCanvasReady(page: Page, expectedEdges = 3) {
  const canvas = page.getByTestId("architecture-canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas.locator(".react-flow__node")).not.toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(canvas.locator(".react-flow__edge")).toHaveCount(expectedEdges, {
    timeout: 15_000,
  });
  return canvas;
}

async function waitForClipboardText(page: Page, substring: string) {
  await expect
    .poll(async () =>
      page.evaluate(async () => navigator.clipboard.readText()),
    )
    .toContain(substring);
}

test.describe("Architecture Canvas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await waitForCanvasReady(page);
  });

  test("renders outbox topology nodes and edges", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");

    for (const nodeId of OUTBOX_NODES) {
      await expectNodeInCanvas(canvas, nodeId);
      await expect(
        canvas.locator(`.react-flow__node[data-id="${nodeId}"] .sc-node-label`),
      ).not.toBeEmpty();
    }

    await expect(canvas.locator(".react-flow__edge")).toHaveCount(3);
  });

  test("fits nodes inside the visible canvas area", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: "Fit View" }).click();

    await expect
      .poll(async () => {
        const canvasBox = await canvas.boundingBox();
        const nodeBox = await canvas
          .locator('.react-flow__node[data-id="OrderService"]')
          .boundingBox();
        if (!canvasBox || !nodeBox) return false;
        return (
          nodeBox.x >= canvasBox.x - 2 &&
          nodeBox.y >= canvasBox.y - 2 &&
          nodeBox.x + nodeBox.width <= canvasBox.x + canvasBox.width + 2
        );
      })
      .toBe(true);

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    for (const nodeId of OUTBOX_NODES) {
      const node = canvas.locator(`.react-flow__node[data-id="${nodeId}"]`);
      const nodeBox = await node.boundingBox();
      expect(nodeBox).not.toBeNull();

      if (!canvasBox || !nodeBox) continue;

      expect(nodeBox.x).toBeGreaterThanOrEqual(canvasBox.x - 2);
      expect(nodeBox.y).toBeGreaterThanOrEqual(canvasBox.y - 2);
      expect(nodeBox.x + nodeBox.width).toBeLessThanOrEqual(
        canvasBox.x + canvasBox.width + 2,
      );
      expect(nodeBox.y + nodeBox.height).toBeLessThanOrEqual(
        canvasBox.y + canvasBox.height + 2,
      );
    }
  });

  test("serialized DSL includes channel definitions", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy DSL" }).click();

    await waitForClipboardText(page, "channel ch1 OrderService -> DB");
    const dsl = await page.evaluate(async () => navigator.clipboard.readText());
    expect(dsl).toContain("channel ch2 DB -> Poller");
    expect(dsl).toContain("channel ch3 Poller -> Kafka");
  });

  test("switching patterns updates the canvas", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    const patternSelect = page.locator(".toolbar-select").first();

    await patternSelect.selectOption("circuit-breaker");
    await waitForCanvasReady(page, 2);

    for (const nodeId of CIRCUIT_BREAKER_NODES) {
      await expectNodeInCanvas(canvas, nodeId);
    }
    await expect(canvas.locator('.react-flow__node[data-id="OrderService"]')).toHaveCount(
      0,
    );
  });

  test("auto layout keeps nodes visible", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: "Auto Layout" }).click();
    await waitForCanvasReady(page, 3);

    await expectNodeInCanvas(canvas, "OrderService");
  });

  test("step selection keeps canvas rendered", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: /Dual Write/ }).click();

    await expectNodeInCanvas(canvas, "DB");
    await expect(canvas.locator(".react-flow__edge")).toHaveCount(3);
  });
});
