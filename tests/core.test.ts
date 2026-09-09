import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { defaultRig, validateRig } from "../src/shared";
import { prepareDeformation, deform } from "../src/mesh";
import { normalizeMonster } from "../server/images";
import { authorize, generate, analyze } from "../server/core";
test("rig rejects wrong dimensions and out-of-image points, caps displacement", () => {
  const r = defaultRig();
  r.points[0].amplitude = 24;
  assert.equal(validateRig(r, 768, 768).points[0].amplitude, 768 * 0.018);
  assert.throws(() => validateRig(r, 512, 768));
  r.points[0].x = -1;
  assert.throws(() => validateRig(r, 768, 768));
});
test("deformation keeps anchored feet still, breathes smoothly, and returns to rest at zero strength", () => {
  const rig = defaultRig();
  const rest = new Float32Array([
    rig.anchors[0].x,
    rig.anchors[0].y,
    rig.points[0].x + 30,
    rig.points[0].y - 20,
  ]);
  const data = prepareDeformation(rest, rig),
    out = rest.slice();
  deform(out, data.rest, data.weights, rig, 1);
  assert.ok(Math.abs(out[0] - rest[0]) < 0.001);
  assert.ok(Math.abs(out[1] - rest[1]) < 0.001);
  assert.notEqual(out[2], rest[2]);
  const previous = out.slice();
  deform(out, data.rest, data.weights, rig, 1.016);
  assert.ok(Math.abs(out[2] - previous[2]) < 0.2);
  deform(out, data.rest, data.weights, rig, 2, 0);
  assert.deepEqual(out, rest);
});
test("background cleanup preserves enclosed pale details and real alpha", async () => {
  const source = Buffer.from(
    '<svg width="128" height="128"><rect width="128" height="128" fill="#f7f6f2"/><rect x="30" y="30" width="68" height="68" fill="#614776"/><circle cx="64" cy="64" r="10" fill="#f7f6f2"/></svg>',
  );
  const normalized = await normalizeMonster(
    await sharp(source).png().toBuffer(),
  );
  const { data } = await sharp(
    Buffer.from(normalized.image.split(",")[1], "base64"),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0);
  assert.equal(data[(64 * 128 + 64) * 4 + 3], 255);
  assert.equal(normalized.cleaned, true);
  const transparent = await sharp({
    create: { width: 128, height: 128, channels: 4, background: "#00000000" },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 50, height: 50, channels: 4, background: "#9988aa" },
        })
          .png()
          .toBuffer(),
        left: 40,
        top: 40,
      },
    ])
    .png()
    .toBuffer();
  assert.equal((await normalizeMonster(transparent)).cleaned, false);
});
test("server auth and generation/analysis contract with mocked provider, signed image and pixel validation", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.OPENROUTER_API_KEY,
    oldCode = process.env.GAME_ACCESS_CODE;
  process.env.OPENROUTER_API_KEY = "unit-test-key";
  process.env.GAME_ACCESS_CODE = "unit-test-access";
  const image = await sharp(
    Buffer.from(
      '<svg width="128" height="128"><rect x="30" y="30" width="68" height="68" fill="#9988aa"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = String(url);
    calls.push(path);
    if (path.endsWith("/models"))
      return Response.json({
        data: [
          {
            id: "openai/gpt-5.6-luna",
            architecture: { input_modalities: ["text", "image"] },
          },
        ],
      });
    const body = JSON.parse(options!.body as string);
    assert.equal(
      (options!.headers as Record<string, string>).Authorization,
      "Bearer unit-test-key",
    );
    if (path.endsWith("/images")) {
      assert.equal(body.model, "openai/gpt-image-2.5-flare");
      return Response.json({ data: [{ b64_json: image.toString("base64") }] });
    }
    assert.equal(body.model, "openai/gpt-5.6-luna");
    assert.equal(body.messages[1].content[1].type, "image_url");
    return Response.json({
      choices: [{ message: { content: JSON.stringify(defaultRig(128, 128)) } }],
    });
  };
  try {
    assert.throws(() => authorize("wrong"));
    authorize("unit-test-access");
    const result = await generate({
      essence: "moon",
      secondary: "flora",
      seed: 123,
    });
    assert.equal(result.width, 128);
    const analysis = await analyze(result);
    assert.equal(analysis.rig.points.length, 4);
    await assert.rejects(() =>
      analyze({ ...result, image: result.image + "tampered" }),
    );
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
    if (oldCode === undefined) delete process.env.GAME_ACCESS_CODE;
    else process.env.GAME_ACCESS_CODE = oldCode;
  }
});
