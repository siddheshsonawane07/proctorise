import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The identity library loads and runs under the production CSP (which `vite preview` now serves
// from public/_headers). Its warmup() fetched a data: URL the CSP refuses and then hung forever,
// which would have frozen every identity check in production (found 2026-11-04).
test.setTimeout(120_000);

test("the identity models load and run under the site's CSP", async ({ page }) => {
  const chunk = readdirSync("dist/assets").find((f) => /^human\.esm-.*\.js$/.test(f));
  expect(chunk).toBeTruthy();
  const refused: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) refused.push(m.text().slice(0, 200));
  });
  await page.goto("/");
  const result = await page.evaluate(async (path) => {
    const m = await import(path);
    const h = new m.Human({
      modelBasePath: "/vendor/human/3.3.6/",
      backend: "webgl",
      debug: false,
      face: {
        enabled: true,
        detector: { enabled: true, maxDetected: 2, rotation: false },
        mesh: { enabled: true },
        iris: { enabled: false },
        description: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
        attention: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: false },
      segmentation: { enabled: false },
      filter: { enabled: false },
    });
    await h.load();
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const r = await h.detect(canvas);
    return { faces: r.face.length, models: Object.keys(h.models.loaded()).length };
  }, `/assets/${chunk}`);
  expect(refused).toEqual([]);
  expect(result).toEqual({ faces: 0, models: 3 });
});
