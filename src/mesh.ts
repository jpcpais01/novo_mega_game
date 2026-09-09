import type { Rig } from "./shared";
// The expensive distance/falloff work runs only when artwork or handles change.
export function prepareDeformation(positions: Float32Array, rig: Rig) {
  const rest = positions.slice();
  const weights = rig.points.map((p) => {
    const w = new Float32Array(rest.length / 2);
    for (let i = 0; i < w.length; i++) {
      const x = rest[i * 2],
        y = rest[i * 2 + 1];
      const d = Math.hypot(x - p.x, y - p.y) / p.radius;
      let weight = d >= 1 ? 0 : (1 - d * d) ** 2;
      for (const a of rig.anchors)
        weight *=
          Math.min(1, Math.hypot(x - a.x, y - a.y) / (rig.width * 0.12)) ** 2;
      w[i] = weight;
    }
    return w;
  });
  return { rest, weights };
}
export function deform(
  out: Float32Array,
  rest: Float32Array,
  weights: Float32Array[],
  rig: Rig,
  time: number,
  strength = 1,
) {
  out.set(rest);
  for (let j = 0; j < rig.points.length; j++) {
    const p = rig.points[j];
    // Smooth slow modulation, never independent per-frame randomness.
    const wave =
      Math.sin(time * p.speed * 2 + p.phase) *
      (0.85 + 0.15 * Math.sin(time * 0.31 + p.phase));
    const amount = wave * p.amplitude * strength;
    for (let i = 0; i < weights[j].length; i++) {
      const movement = amount * weights[j][i];
      if (p.direction === "breathe") {
        out[i * 2] += ((rest[i * 2] - p.x) / p.radius) * movement;
        out[i * 2 + 1] += ((rest[i * 2 + 1] - p.y) / p.radius) * movement * 0.7;
      } else out[i * 2 + (p.direction === "vertical" ? 1 : 0)] += movement;
    }
  }
}
