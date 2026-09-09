import sharp from "sharp";
export async function normalizeMonster(bytes: Buffer) {
  const { data, info } = await sharp(bytes, { limitInputPixels: 20_000_000 })
    .rotate()
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 16) clear++;
  let cleaned = false;
  if (clear / (width * height) < 0.02) {
    // Only erase a uniform, edge-connected backdrop. Preserve interior highlights.
    const corners = [0, width - 1, (height - 1) * width, height * width - 1];
    const base = [0, 1, 2].map(
      (c) => corners.reduce((sum, p) => sum + data[p * 4 + c], 0) / 4,
    );
    if (
      corners.some(
        (p) => Math.hypot(...base.map((v, c) => data[p * 4 + c] - v)) > 50,
      )
    )
      throw new Error(
        "The image has a complex background. Try another hatch; a clean cutout is required.",
      );
    const visited = new Uint8Array(width * height),
      queue = new Int32Array(width * height);
    let head = 0,
      tail = 0;
    const add = (p: number) => {
      if (p < 0 || p >= visited.length || visited[p]) return;
      visited[p] = 1;
      const d = Math.hypot(...base.map((v, c) => data[p * 4 + c] - v));
      if (d < 65) {
        queue[tail++] = p;
        data[p * 4 + 3] = Math.round(Math.max(0, (d - 28) / 37) * 255);
      }
    };
    for (let x = 0; x < width; x++) {
      add(x);
      add((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      add(y * width);
      add(y * width + width - 1);
    }
    while (head < tail) {
      const p = queue[head++];
      if (p % width > 0) add(p - 1);
      if (p % width < width - 1) add(p + 1);
      add(p - width);
      add(p + width);
    }
    if (tail > width * height * 0.97 || tail < width * height * 0.03)
      throw new Error(
        "Could not separate the creature from its background. Please try again.",
      );
    cleaned = true;
  }
  const png = await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ palette: true, quality: 95, colors: 256 })
    .toBuffer();
  return {
    image: `data:image/png;base64,${png.toString("base64")}`,
    width,
    height,
    cleaned,
  };
}
