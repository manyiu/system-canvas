import { expect, type Locator, type Page, test } from "@playwright/test";

const BITLY_NODES = [
  "Client",
  "CDN",
  "LoadBalancer",
  "URLService",
  "RedisCache",
  "PrimaryDB",
  "Kafka",
  "AnalyticsService",
];
const RATE_LIMITER_NODES = [
  "Client",
  "APIGateway",
  "RateLimiterService",
  "RedisCounter",
  "BackendService",
];

async function expectNodeInCanvas(canvas: Locator, nodeId: string) {
  const node = canvas.locator(`.react-flow__node[data-id="${nodeId}"]`);
  await expect(node).toHaveCount(1);

  const box = await node.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
}

async function waitForCanvasReady(page: Page, expectedEdges?: number) {
  const canvas = page.getByTestId("architecture-canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas.locator(".react-flow__node")).not.toHaveCount(0, {
    timeout: 15_000,
  });
  if (expectedEdges !== undefined) {
    await expect(canvas.locator(".react-flow__edge")).toHaveCount(expectedEdges, {
      timeout: 15_000,
    });
  }
  return canvas;
}

async function waitForClipboardText(page: Page, substring: string) {
  await expect
    .poll(async () => page.evaluate(async () => navigator.clipboard.readText()))
    .toContain(substring);
}

async function selectExample(page: Page, id: string) {
  await page.getByTestId("examples-menu-trigger").click();
  await page.getByTestId(`example-item-${id}`).click();
}

/** Edit System DSL in Monaco so the editor onChange path runs (debounce → setFromDsl). */
async function replaceDslText(page: Page, find: string, replacement: string) {
  await page.waitForFunction(() => {
    const monaco = (window as unknown as { monaco?: { editor: { getModels: () => unknown[] } } })
      .monaco;
    return (monaco?.editor.getModels().length ?? 0) > 0;
  });

  await page.evaluate(
    ({ find, replacement }) => {
      const model = (
        window as unknown as {
          monaco: {
            editor: {
              getModels: () => Array<{ getValue: () => string; setValue: (value: string) => void }>;
            };
          };
        }
      ).monaco.editor.getModels()[0];
      const current = model.getValue();
      if (!current.includes(find)) {
        throw new Error(`DSL substring not found: ${find}`);
      }
      model.setValue(current.replace(find, replacement));
    },
    { find, replacement },
  );
}

test.describe("Architecture Canvas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await waitForCanvasReady(page, 7);
  });

  test("renders bitly topology nodes and edges", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");

    for (const nodeId of BITLY_NODES) {
      await expectNodeInCanvas(canvas, nodeId);
      await expect(
        canvas.locator(`.react-flow__node[data-id="${nodeId}"] .sc-node-label`),
      ).not.toBeEmpty();
    }

    await expect(canvas.locator(".react-flow__edge")).toHaveCount(7);
  });

  test("fits nodes inside the visible canvas area", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: "Fit View" }).click();

    await expect
      .poll(async () => {
        const canvasBox = await canvas.boundingBox();
        const nodeBox = await canvas
          .locator('.react-flow__node[data-id="URLService"]')
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

    for (const nodeId of BITLY_NODES) {
      const node = canvas.locator(`.react-flow__node[data-id="${nodeId}"]`);
      const nodeBox = await node.boundingBox();
      expect(nodeBox).not.toBeNull();

      if (!canvasBox || !nodeBox) continue;

      expect(nodeBox.x).toBeGreaterThanOrEqual(canvasBox.x - 2);
      expect(nodeBox.y).toBeGreaterThanOrEqual(canvasBox.y - 2);
      expect(nodeBox.x + nodeBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 2);
      expect(nodeBox.y + nodeBox.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height + 2);
    }
  });

  test("hides MiniMap when the graph fits and shows it after zoom-in", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    const minimap = canvas.locator(".react-flow__minimap");

    await page.getByRole("button", { name: "Fit View" }).click();
    await expect(minimap).toHaveCount(0);

    // Zoom in repeatedly until the overview navigator appears.
    const zoomIn = page.getByRole("button", { name: "Zoom In" });
    await expect
      .poll(async () => {
        if ((await minimap.count()) > 0) return true;
        await zoomIn.click();
        return (await minimap.count()) > 0;
      })
      .toBe(true);

    await expect(minimap).toBeVisible();
    const box = await minimap.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(160);
    expect(box!.height).toBeLessThanOrEqual(110);

    const minimapNodes = minimap.locator(".react-flow__minimap-node");
    await expect(minimapNodes).toHaveCount(BITLY_NODES.length);

    // Playback sync must not strip measured sizes (empty MiniMap regression).
    await page.getByRole("button", { name: /Persist to DB/ }).click();
    await expect(minimapNodes).toHaveCount(BITLY_NODES.length);

    await page.getByRole("button", { name: "Fit View" }).click();
    await expect(minimap).toHaveCount(0);
  });

  test("serialized DSL includes channel definitions", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByTestId("copy-dsl").click();

    await waitForClipboardText(page, "channel ch1 Client -> CDN");
    const dsl = await page.evaluate(async () => navigator.clipboard.readText());
    expect(dsl).toContain("URLService -> RedisCache");
    expect(dsl).toContain("URLService -> PrimaryDB");
  });

  test("switching templates updates the canvas", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");

    await selectExample(page, "rate-limiter");
    await waitForCanvasReady(page);

    for (const nodeId of RATE_LIMITER_NODES) {
      await expectNodeInCanvas(canvas, nodeId);
    }
    await expect(canvas.locator('.react-flow__node[data-id="URLService"]')).toHaveCount(0);
  });

  test("examples menu shows current example and difficulty groups", async ({ page }) => {
    await expect(page.getByTestId("examples-menu-trigger")).toContainText("Bitly");
    await page.getByTestId("examples-menu-trigger").click();
    await expect(page.getByTestId("example-item-bitly")).toHaveClass(/active/);
    await expect(page.getByText("Easy")).toBeVisible();
    await expect(page.getByText("Medium")).toBeVisible();
    await expect(page.getByTestId("reload-example")).toBeEnabled();
  });

  test("clicking active example does not reset document", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    const node = canvas.locator('.react-flow__node[data-id="URLService"]');
    const box = await node.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 80, box!.y + 40, { steps: 12 });
    await page.mouse.up();

    await expect
      .poll(async () => {
        const next = await node.boundingBox();
        return next ? Math.round(next.x) : null;
      })
      .not.toBe(Math.round(box!.x));

    const movedX = Math.round((await node.boundingBox())!.x);

    await page.getByTestId("examples-menu-trigger").click();
    await page.getByTestId("example-item-bitly").click();

    await expect
      .poll(async () => {
        const next = await node.boundingBox();
        return next ? Math.round(next.x) : null;
      })
      .toBe(movedX);
  });

  test("shows current step title in playback row", async ({ page }) => {
    const title = page.getByTestId("current-step-title");
    await expect(title).toBeVisible();
    await expect(title).toContainText("Client Request");
    await page.getByRole("button", { name: /Persist to DB/ }).click();
    await expect(title).toContainText("Persist to DB");
  });

  test("shows all bitly scenarios as chips", async ({ page }) => {
    const strip = page.getByTestId("scenario-strip");
    await expect(strip.getByTestId("scenario-chip-bitly-shorten")).toBeVisible();
    await expect(strip.getByTestId("scenario-chip-bitly-cache-hit")).toBeVisible();
    await expect(strip.getByTestId("scenario-chip-bitly-cache-miss")).toBeVisible();
    await expect(strip.getByTestId("scenario-chip-bitly-shorten")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("template load aligns nodes without Auto Layout", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await selectExample(page, "rate-limiter");
    await waitForCanvasReady(page);

    const boxes = await Promise.all(
      RATE_LIMITER_NODES.map(async (nodeId) => {
        const box = await canvas.locator(`.react-flow__node[data-id="${nodeId}"]`).boundingBox();
        expect(box).not.toBeNull();
        return box!;
      }),
    );

    const xs = boxes.map((b) => b.x);
    const ys = boxes.map((b) => b.y);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    const ySpread = Math.max(...ys) - Math.min(...ys);
    expect(xSpread).toBeGreaterThan(40);
    expect(ySpread).toBeLessThan(xSpread);
  });

  test("shows sync vs async channel styles", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    // React Flow edge wrappers are SVG <g> nodes; prefer count over visibility.
    await expect(canvas.locator(".react-flow__edge.sc-edge-sync")).not.toHaveCount(0);
    await expect(canvas.locator(".react-flow__edge.sc-edge-async")).not.toHaveCount(0);
    await expect(canvas.getByText("sync — solid")).toBeVisible();
    await expect(canvas.getByText("async — dashed")).toBeVisible();
  });

  test("step selection animates active channel edges", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");

    await selectExample(page, "bitly");
    await page.getByTestId("scenario-chip-bitly-cache-hit").click();
    await page.getByRole("button", { name: /Cache Hit/ }).click();
    await expect(canvas.locator(".react-flow__edge.sc-edge-sync.animated")).not.toHaveCount(0);
  });

  test("auto layout keeps nodes visible", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: "Auto Layout" }).click();
    await waitForCanvasReady(page, 7);

    await expectNodeInCanvas(canvas, "URLService");
  });

  test("moving nodes does not corrupt channel labels in DSL", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const canvas = page.getByTestId("architecture-canvas");
    const node = canvas.locator('.react-flow__node[data-id="URLService"]');
    await expect(node).toBeVisible();

    const box = await node.boundingBox();
    expect(box).not.toBeNull();

    async function readDslFromClipboard() {
      await page.getByTestId("copy-dsl").click();
      return page.evaluate(async () => navigator.clipboard.readText());
    }

    const initialDsl = await readDslFromClipboard();
    await waitForClipboardText(page, 'label: "lookup"');

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 80, box!.y + 40, { steps: 12 });
    await page.mouse.up();

    await expect
      .poll(async () => {
        const dsl = await readDslFromClipboard();
        const match = dsl.match(/service URLService \{[^}]*x: (-?\d+)/);
        return match ? Number(match[1]) : null;
      })
      .not.toBe(0);

    const afterDsl = await readDslFromClipboard();

    expect(afterDsl).toContain('label: "lookup"');
    expect(afterDsl).toContain('label: "persist"');
    expect(afterDsl.length).toBeLessThanOrEqual(initialDsl.length + 120);
  });

  test("DSL edits update canvas after example switch and node drag", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");

    // Pattern sync previously left skipNextDslParse stuck true (Monaco suppresses echo onChange).
    await selectExample(page, "rate-limiter");
    await waitForCanvasReady(page);
    await expect(
      canvas.locator('.react-flow__node[data-id="RateLimiterService"] .sc-node-label'),
    ).toHaveText("Rate Limiter");

    // Canvas sync was the other path that set the stuck flag.
    const node = canvas.locator('.react-flow__node[data-id="RateLimiterService"]');
    const box = await node.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 60, box!.y + 30, { steps: 10 });
    await page.mouse.up();

    await replaceDslText(page, 'label: "Rate Limiter"', 'label: "Renamed Limiter"');

    await expect(
      canvas.locator('.react-flow__node[data-id="RateLimiterService"] .sc-node-label'),
    ).toHaveText("Renamed Limiter", { timeout: 5_000 });
  });

  test("review panel renders for examples", async ({ page }) => {
    const reviewPanel = page.getByTestId("review-panel");
    await expect(reviewPanel).toBeVisible();
    await expect(reviewPanel.getByText("Architecture Review")).toBeVisible();

    await selectExample(page, "rate-limiter");
    await waitForCanvasReady(page);

    await expect(reviewPanel).toBeVisible();
  });

  test("step selection keeps canvas rendered", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: /Client Request/ }).click();

    await expectNodeInCanvas(canvas, "PrimaryDB");
    await expect(canvas.locator(".react-flow__edge")).toHaveCount(7);
  });

  test("play advances steps automatically", async ({ page }) => {
    const timeline = page.getByTestId("step-timeline");
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("1/3");

    await timeline.getByTestId("playback-speed").selectOption("2");
    await timeline.getByTestId("playback-play-pause").click();

    await expect(timeline.getByTestId("playback-step-label")).toHaveText("2/3", {
      timeout: 3_000,
    });
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
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute("aria-label", "Play");

    const label = await timeline.getByTestId("playback-step-label").textContent();
    await page.waitForTimeout(1_200);
    await expect(timeline.getByTestId("playback-step-label")).toHaveText(label ?? "");
  });

  test("scrubber and step buttons seek and pause playback", async ({ page }) => {
    const timeline = page.getByTestId("step-timeline");

    await timeline.getByTestId("playback-step-forward").click();
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("2/3");

    await timeline.getByRole("button", { name: /Client Request/ }).click();
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("1/3");
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute("aria-label", "Play");
  });

  test("scenario switch resets playback to step 1", async ({ page }) => {
    const timeline = page.getByTestId("step-timeline");
    await timeline.getByTestId("playback-step-forward").click();
    await expect(timeline.getByTestId("playback-step-label")).toHaveText("2/3");

    await timeline.getByTestId("scenario-chip-bitly-cache-hit").click();
    await expect(timeline.getByTestId("playback-step-label")).toHaveText(/1\//);
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute("aria-label", "Play");
    await expect(timeline.getByTestId("scenario-chip-bitly-cache-hit")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Client Request shows payload packet on URLService channel", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: /Client Request/ }).click();

    const packet = canvas.getByTestId("payload-packet");
    await expect(packet).toBeVisible();
    await expect(packet).toHaveAttribute("data-channel-id", "ch3");
    await expect(packet).toHaveAttribute("data-payload-type", "ShortenURL");
    await expect(canvas.locator('.react-flow__edge[data-id="ch3"].sc-edge-sync')).toHaveCount(1);
  });

  test("Persist to DB shows payload packet", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    await page.getByRole("button", { name: /Persist to DB/ }).click();

    const packet = canvas.getByTestId("payload-packet");
    await expect(packet).toBeVisible();
    await expect(packet).toHaveAttribute("data-channel-id", "ch-db");
    await expect(packet).toHaveAttribute("data-payload-type", "StoreMapping");
  });

  test("scrubbing swaps payload packet between steps", async ({ page }) => {
    const canvas = page.getByTestId("architecture-canvas");
    const timeline = page.getByTestId("step-timeline");

    await timeline.getByTestId("playback-step-forward").click();
    await expect(canvas.getByTestId("payload-packet")).toHaveAttribute("data-channel-id", "ch-db");

    await timeline.getByRole("button", { name: /Client Request/ }).click();
    await expect(canvas.getByTestId("payload-packet")).toHaveAttribute("data-channel-id", "ch3");
    await expect(timeline.getByTestId("playback-play-pause")).toHaveAttribute("aria-label", "Play");
  });
});
