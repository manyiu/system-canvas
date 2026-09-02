import { expect, test, type Locator, type Page } from "@playwright/test";

const OUTBOX_NODES = ["OrderService", "DB", "Poller", "Kafka"];

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
    await page.waitForTimeout(400);

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

    const dsl = await page.evaluate(async () => navigator.clipboard.readText());
    expect(dsl).toContain("channel ch1 OrderService -> DB");
    expect(dsl).toContain("channel ch2 DB -> Poller");
    expect(dsl).toContain("channel ch3 Poller -> Kafka");
  });

  test("switching patterns updates the canvas", async ({ page }) => {
    const patternSelect = page.locator(".toolbar-select").first();

    await patternSelect.selectOption("circuit-breaker");
    await waitForCanvasReady(page, 2);
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
    await page.waitForTimeout(200);

    await expectNodeInCanvas(canvas, "DB");
    await expect(canvas.locator(".react-flow__edge")).toHaveCount(3);
  });
});
