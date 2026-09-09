import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
await fs.mkdir("output/qa", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const errors = [];
const base = process.env.QA_URL || "http://localhost:5173";
const context = await browser.newContext({
  viewport: { width: 1440, height: 1024 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
// Fixtures exist only in this test runner; the shipped game always calls live APIs.
const fixture = await fs.readFile("tests/fixtures/companion-moon.png");
const fixtureRig = {
  width: 768,
  height: 768,
  anchors: [
    { x: 307, y: 653 },
    { x: 468, y: 653 },
  ],
  points: [
    {
      label: "Breathing",
      x: 392,
      y: 461,
      radius: 207,
      amplitude: 6,
      direction: "breathe",
      speed: 0.55,
      phase: 0,
    },
    {
      label: "Head",
      x: 384,
      y: 269,
      radius: 177,
      amplitude: 4,
      direction: "horizontal",
      speed: 0.35,
      phase: 1,
    },
    {
      label: "Tail",
      x: 591,
      y: 507,
      radius: 138,
      amplitude: 6,
      direction: "vertical",
      speed: 0.45,
      phase: 3,
    },
  ],
};
await page.route("**/api/generate", (route) => {
  assert.equal(route.request().headers()["x-hatchery-code"], undefined);
  return route.fulfill({
    json: {
      image: `data:image/png;base64,${fixture.toString("base64")}`,
      width: 768,
      height: 768,
    },
  });
});
await page.route("**/api/analyze", (route) =>
  route.fulfill({ json: { rig: fixtureRig } }),
);
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(base);
await page.waitForFunction(
  () =>
    typeof window.render_game_to_text === "function" &&
    document.querySelector("canvas"),
);
await page.waitForTimeout(1000);
assert.equal(
  await page.evaluate(() => JSON.parse(window.render_game_to_text()).mode),
  "live",
);
await page.click('[data-action="settings"]');
assert.equal(await page.locator("#live-toggle, #access-code").count(), 0);
await page.click('[data-action="close"]');
await page.screenshot({ path: "output/qa/desktop-egg.png", fullPage: true });
await page.click('[data-essence="flora"]');
assert.deepEqual(
  await page.evaluate(() => JSON.parse(window.render_game_to_text()).essences),
  ["moon", "flora"],
);
await page.click("#hatch-button");
await page.waitForFunction(
  () => JSON.parse(window.render_game_to_text()).phase === "monster",
  {},
  { timeout: 15000 },
);
await page.waitForFunction(
  () => JSON.parse(window.render_game_to_text()).collectionCount === 1,
);
await page.screenshot({
  path: "output/qa/desktop-companion.png",
  fullPage: true,
});
await page.locator('[data-action="motion"]').first().click();
await page.locator("#strength").fill("1.5");
assert.equal(
  await page.evaluate(() => JSON.parse(window.render_game_to_text()).strength),
  1.5,
);
const dragPoint = await page.evaluate(() => {
  const r = document.querySelector("#scene").getBoundingClientRect(),
    p = JSON.parse(window.render_game_to_text()).companion.rig.points[0],
    s = Math.min(r.width / 680, r.height / 570);
  return {
    x: r.x + r.width / 2 - 384 * s + (154 + (p.x * 460) / 768) * s,
    y:
      r.y +
      r.height / 2 -
      300 * s -
      24 +
      (490 - 460 * 0.85 + (p.y * 460) / 768) * s,
    oldX: p.x,
  };
});
await page.mouse.move(dragPoint.x, dragPoint.y);
await page.mouse.down();
await page.mouse.move(dragPoint.x + 20, dragPoint.y - 15, { steps: 6 });
await page.mouse.up();
assert.ok(
  (await page.evaluate(
    () => JSON.parse(window.render_game_to_text()).companion.rig.points[0].x,
  )) >
    dragPoint.oldX + 10,
);
await page.click('[data-action="pause"]');
assert.equal(
  await page.evaluate(() => JSON.parse(window.render_game_to_text()).paused),
  true,
);
await page.click('[data-action="pause"]');
await page.click('[data-action="close"]');
await page.click('[data-action="collection"]');
assert.equal(await page.locator(".companion-card").count(), 1);
await page.screenshot({ path: "output/qa/collection.png", fullPage: true });
await page.reload();
await page.waitForFunction(
  () => JSON.parse(window.render_game_to_text()).collectionCount === 1,
);
await page.click('[data-action="collection"]');
await page.click(".companion-card");
await page.waitForFunction(
  () => JSON.parse(window.render_game_to_text()).phase === "monster",
);
await page.click('[data-action="journal"]');
assert.equal(await page.locator(".journal-card").count(), 4);
await page.click('[data-journal="ember"]');
assert.deepEqual(
  await page.evaluate(() => JSON.parse(window.render_game_to_text()).essences),
  ["ember"],
);
await page.click('[data-action="settings"]');
await page.check("#reduced-toggle");
await page.click('[data-action="save-settings"]');
assert.equal(
  await page.evaluate(
    () => JSON.parse(window.render_game_to_text()).reducedMotion,
  ),
  true,
);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "output/qa/mobile-egg.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
);
await page.click("#hatch-button");
await page.waitForFunction(
  () => JSON.parse(window.render_game_to_text()).phase === "monster",
  {},
  { timeout: 15000 },
);
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({
  path: "output/qa/mobile-companion.png",
  fullPage: true,
});
await page.locator('[data-action="motion"]').first().click();
await page.screenshot({ path: "output/qa/mobile-editor.png", fullPage: true });
await page.click('[data-action="close"]');
await page.click('[data-action="collection"]');
assert.equal(await page.locator(".companion-card").count(), 2);
if (process.env.QA_OFFLINE === "1") {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).collectionCount === 2,
  );
  await page.click('[data-action="collection"]');
  await page.locator(".companion-card").first().click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === "monster",
  );
  await page.screenshot({
    path: "output/qa/offline-companion.png",
    fullPage: true,
  });
}
await fs.writeFile(
  "output/qa/results.json",
  JSON.stringify(
    {
      errors,
      state: JSON.parse(
        await page.evaluate(() => window.render_game_to_text()),
      ),
      offline: process.env.QA_OFFLINE === "1",
    },
    null,
    2,
  ),
);
await browser.close();
assert.deepEqual(
  errors.filter((e) => !e.includes("net::ERR_INTERNET_DISCONNECTED")),
  [],
);
console.log(
  "Passed: hatch, blend, persistence, collection, journal, motion controls, reduced motion, mobile layout" +
    (process.env.QA_OFFLINE ? " and offline reload." : "."),
);
