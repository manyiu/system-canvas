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

  test("shows sync vs async channel styles", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await expect(canvas.locator(".react-flow__edge.sc-edge-sync")).toHaveCount(1);
    await expect(canvas.locator(".react-flow__edge.sc-edge-async")).toHaveCount(2);
    await expect(canvas.getByText("sync — solid")).toBeVisible();
    await expect(canvas.getByText("async — dashed")).toBeVisible();
  });

  test("step selection animates active channel edges", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");

    // Dual Write: ch1 is sync — highlighted solid, no dash animation
    await expect(canvas.locator(".react-flow__edge.sc-edge-sync")).toHaveCount(1);
    await expect(canvas.locator(".react-flow__edge.animated")).toHaveCount(0);

    await page.getByRole("button", { name: /Poller Dispatch/ }).click();
    await expect(
      canvas.locator('.react-flow__edge[data-id="ch3"].sc-edge-async.animated'),
    ).toHaveCount(1);
  });

  test("step selection highlights port visuals", async ({ page }) => {
    await page.getByRole("button", { name: /Dual Write/ }).click();

    const outboxPort = page.locator(".sc-port-chip", { hasText: "Outbox Table" });
    await expect(outboxPort).toHaveClass(/sc-port-chip-active/);
  });

  test("auto layout keeps nodes visible", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: "Auto Layout" }).click();
    await waitForCanvasReady(page, 3);

    await expectNodeInCanvas(canvas, "OrderService");
  });

  test("moving nodes does not corrupt channel labels in DSL", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const canvas = page.getByTestId("architecture-canvas");
    const node = canvas.locator('.react-flow__node[data-id="OrderService"]');
    await expect(node).toBeVisible();

    const box = await node.boundingBox();
    expect(box).not.toBeNull();

    async function readDslFromClipboard() {
      await page.getByRole("button", { name: "Copy DSL" }).click();
      return page.evaluate(async () => navigator.clipboard.readText());
    }

    const initialDsl = await readDslFromClipboard();
    await waitForClipboardText(page, 'label: "poll"');
    expect(initialDsl).not.toMatch(/async · poll · async · poll/);

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 80, box!.y + 40, { steps: 12 });
    await page.mouse.up();

    await expect
      .poll(async () => {
        const dsl = await readDslFromClipboard();
        const match = dsl.match(/service OrderService \{[^}]*x: (-?\d+)/);
        return match ? Number(match[1]) : null;
      })
      .not.toBe(0);

    const afterDsl = await readDslFromClipboard();

    expect(afterDsl).toContain('label: "poll"');
    expect(afterDsl).toContain('label: "publish"');
    expect(afterDsl).not.toMatch(/async · poll · async · poll/);
    expect(afterDsl).not.toMatch(/async · event · async · event/);
    expect(afterDsl.length).toBeLessThanOrEqual(initialDsl.length + 120);
  });

  test("review panel omits outbox rules for other patterns", async ({ page }) => {
    const reviewPanel = page.getByTestId("review-panel");
    await expect(reviewPanel).toBeVisible();
    await expect(reviewPanel.getByText("Architecture Review")).toBeVisible();
    await expect(reviewPanel.locator(".review-lint-rule")).toHaveCount(0);

    const patternSelect = page.locator(".toolbar-select").first();
    await patternSelect.selectOption("circuit-breaker");
    await waitForCanvasReady(page, 2);

    await expect(reviewPanel).toBeVisible();
    await expect(reviewPanel.locator(".review-lint-rule")).toHaveCount(0);
    await expect(reviewPanel).not.toContainText("outbox-missing-sync-persist");
    await expect(reviewPanel).not.toContainText("outbox-missing-async-publish");
    await expect(reviewPanel).not.toContainText("missing-relationship");
  });

  test("step selection keeps canvas rendered", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: /Dual Write/ }).click();

    await expectNodeInCanvas(canvas, "DB");
    await expect(canvas.locator(".react-flow__edge")).toHaveCount(3);
  });

  test("play advances steps automatically", async ({ page }) => {
    const timeline = page.getByTestId("step-timeline");
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("1/2");

    await timeline.getByTestId("playback-speed").selectOption("2");
    await timeline.getByTestId("playback-play-pause").click();

    await expect(timeline.getByTestId("playback-step-label")).toHaveText("2/2", {
      timeout: 3_000,
    });
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute(
      "aria-label",
      "Play",
    );
  });

  test("pause stops auto-advance", async ({ page }) => {
    const timeline = page.getByTestId("step-timeline");
    await timeline.getByTestId("playback-speed").selectOption("0.5");
    await timeline.getByTestId("playback-play-pause").click();
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute(
      "aria-label",
      "Pause",
    );

    await timeline.getByTestId("playback-play-pause").click();
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute(
      "aria-label",
      "Play",
    );

    const label = await timeline.getByTestId("playback-step-label").textContent();
    await page.waitForTimeout(1_200);
    await expect(timeline.getByTestId("playback-step-label")).toHaveText(
      label ?? "",
    );
  });

  test("scrubber and step buttons seek and pause playback", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    const timeline = page.getByTestId("step-timeline");

    await timeline.getByTestId("playback-step-forward").click();
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("2/2");
    await expect(
      canvas.locator('.react-flow__edge[data-id="ch3"].sc-edge-async.animated'),
    ).toHaveCount(1);

    await timeline.getByRole("button", { name: /Dual Write/ }).click();
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("1/2");
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute(
      "aria-label",
      "Play",
    );
  });

  test("scenario switch resets playback to step 1", async ({ page }) => {
    const timeline = page.getByTestId("step-timeline");
    await timeline.getByTestId("playback-step-forward").click();
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("2/2");

    const scenarioSelect = timeline.getByTestId("scenario-select");
    const options = scenarioSelect.locator("option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);

    await scenarioSelect.selectOption({ index: 1 });
    await expect(timeline.getByTestId("playback-step-label")).toHaveText(/1\//);
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute(
      "aria-label",
      "Play",
    );
  });

  test("Dual Write shows payload packet on OrderService → DB", async ({
    page,
  }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: /Dual Write/ }).click();

    const packet = canvas.getByTestId("payload-packet");
    await expect(packet).toBeVisible();
    await expect(packet).toHaveAttribute("data-channel-id", "ch1");
    await expect(packet).toHaveAttribute("data-payload-type", "PlaceOrder");
    await expect(
      canvas.locator('.react-flow__edge[data-id="ch1"].sc-edge-sync'),
    ).toHaveCount(1);
  });

  test("Poller Dispatch shows payload packet on Poller → Kafka", async ({
    page,
  }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: /Poller Dispatch/ }).click();

    const packet = canvas.getByTestId("payload-packet");
    await expect(packet).toBeVisible();
    await expect(packet).toHaveAttribute("data-channel-id", "ch3");
    await expect(packet).toHaveAttribute("data-payload-type", "OrderCreated");
    await expect(
      canvas.locator('.react-flow__edge[data-id="ch3"].sc-edge-async.animated'),
    ).toHaveCount(1);
  });

  test("scrubbing swaps payload packet between steps", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    const timeline = page.getByTestId("step-timeline");

    await timeline.getByTestId("playback-step-forward").click();
    await expect(canvas.getByTestId("payload-packet")).toHaveAttribute(
      "data-channel-id",
      "ch3",
    );

    await timeline.getByRole("button", { name: /Dual Write/ }).click();
    await expect(canvas.getByTestId("payload-packet")).toHaveAttribute(
      "data-channel-id",
      "ch1",
    );
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute(
      "aria-label",
      "Play",
    );
  });
});
