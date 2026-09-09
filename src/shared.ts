import { z } from "zod";
export const essenceIds = ["moon", "flora", "ember", "tide"] as const;
export type EssenceId = (typeof essenceIds)[number];
export const essences = {
  moon: {
    name: "Moonstone",
    type: "Celestial",
    color: "#cbb4ff",
    icon: "moon-star",
    description: "Quiet magic. A curious soul.",
    trait: "Dreamwalker",
    power: 68,
    spirit: 94,
    vitality: 72,
  },
  flora: {
    name: "Wildbloom",
    type: "Nature",
    color: "#a8e1b1",
    icon: "sprout",
    description: "A wild heart, softly growing.",
    trait: "Bloomkeeper",
    power: 62,
    spirit: 78,
    vitality: 96,
  },
  ember: {
    name: "Emberglow",
    type: "Fire",
    color: "#ffb49a",
    icon: "flame",
    description: "Small sparks. Fearless spirit.",
    trait: "Sparkheart",
    power: 96,
    spirit: 70,
    vitality: 68,
  },
  tide: {
    name: "Dewdrop",
    type: "Water",
    color: "#9edbea",
    icon: "droplets",
    description: "A gentle tide of possibility.",
    trait: "Tidecaller",
    power: 74,
    spirit: 88,
    vitality: 82,
  },
};
export const pointSchema = z.object({
  label: z.string().min(1).max(32),
  x: z.number().finite(),
  y: z.number().finite(),
  radius: z.number().positive(),
  amplitude: z.number().min(0).max(24),
  direction: z.enum(["vertical", "horizontal", "breathe"]),
  speed: z.number().min(0.15).max(2),
  phase: z.number().min(0).max(6.284),
});
export const rigSchema = z.object({
  width: z.number().int().min(64).max(2048),
  height: z.number().int().min(64).max(2048),
  anchors: z
    .array(z.object({ x: z.number().finite(), y: z.number().finite() }))
    .min(1)
    .max(4),
  points: z.array(pointSchema).min(3).max(5),
});
export type MotionPoint = z.infer<typeof pointSchema>;
export type Rig = z.infer<typeof rigSchema>;
export function validateRig(
  input: unknown,
  width: number,
  height: number,
): Rig {
  const rig = rigSchema.parse(input);
  if (rig.width !== width || rig.height !== height)
    throw new Error("Animation coordinates do not match the image dimensions.");
  const edge = Math.min(width, height);
  for (const p of [...rig.points, ...rig.anchors]) {
    if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height)
      throw new Error("Animation point lies outside the image.");
  }
  rig.points = rig.points.map((p) => ({
    ...p,
    amplitude: Math.min(p.amplitude, edge * 0.018),
    radius: Math.max(edge * 0.04, Math.min(p.radius, edge * 0.45)),
  }));
  return rig;
}
export function defaultRig(width = 768, height = 768): Rig {
  return {
    width,
    height,
    anchors: [
      { x: width * 0.4, y: height * 0.85 },
      { x: width * 0.61, y: height * 0.85 },
    ],
    points: [
      {
        label: "Breathing",
        x: width * 0.51,
        y: height * 0.6,
        radius: width * 0.27,
        amplitude: width * 0.008,
        direction: "breathe",
        speed: 0.55,
        phase: 0,
      },
      {
        label: "Head sway",
        x: width * 0.5,
        y: height * 0.35,
        radius: width * 0.23,
        amplitude: width * 0.006,
        direction: "horizontal",
        speed: 0.35,
        phase: 1,
      },
      {
        label: "Ear tips",
        x: width * 0.31,
        y: height * 0.22,
        radius: width * 0.16,
        amplitude: width * 0.005,
        direction: "vertical",
        speed: 0.4,
        phase: 2,
      },
      {
        label: "Tail",
        x: width * 0.77,
        y: height * 0.66,
        radius: width * 0.18,
        amplitude: width * 0.009,
        direction: "vertical",
        speed: 0.45,
        phase: 3,
      },
    ],
  };
}
export interface Companion {
  id: string;
  name: string;
  essence: EssenceId;
  secondary: EssenceId | null;
  image: string;
  rig: Rig;
  createdAt: number;
  demo: boolean;
  seed: number;
}
export const hatchSchema = z.object({
  essence: z.enum(essenceIds),
  secondary: z.enum(essenceIds).nullable(),
  seed: z.number().int().min(0).max(2147483647),
});
