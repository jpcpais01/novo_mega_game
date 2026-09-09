import {
  Application,
  Assets,
  Container,
  Graphics,
  Mesh,
  MeshPlane,
  Sprite,
  Texture,
  Text,
  Rectangle,
} from "pixi.js";
import type { Rig } from "./shared";
import { prepareDeformation, deform } from "./mesh";
export type SceneMode = "egg" | "incubating" | "hatching" | "monster";
export class HatchScene {
  app = new Application();
  world = new Container();
  creature = new Container();
  egg!: Sprite;
  mesh: Mesh | null = null;
  debug = new Container();
  cracks = new Graphics();
  shards: Graphics[] = [];
  particles: Sprite[] = [];
  mode: SceneMode = "egg";
  time = 0;
  hatchTime = 0;
  strength = 1;
  paused = false;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private rig: Rig | null = null;
  private prepared: ReturnType<typeof prepareDeformation> | null = null;
  private editing = false;
  private drag = -1;
  private observer!: ResizeObserver;
  private assetKey = "";
  onHatched = () => {};
  onRigChanged = (_rig: Rig) => {};
  async init(host: HTMLElement) {
    await this.app.init({
      resizeTo: host,
      resolution: Math.min(devicePixelRatio, 1.75),
      autoDensity: true,
      antialias: false,
      backgroundAlpha: 0,
      preference: "webgl",
      powerPreference: "low-power",
    });
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute(
      "aria-label",
      "Animated egg and companion in a moonlit summoning circle",
    );
    const back = document.createElement("canvas");
    back.width = 900;
    back.height = 700;
    const c = back.getContext("2d")!;
    const bg = c.createLinearGradient(0, 0, 0, 700);
    bg.addColorStop(0, "#202338");
    bg.addColorStop(0.5, "#393650");
    bg.addColorStop(1, "#202933");
    c.fillStyle = bg;
    c.fillRect(0, 0, 900, 700);
    const aura = c.createRadialGradient(450, 320, 0, 450, 320, 350);
    aura.addColorStop(0, "#a38cbd45");
    aura.addColorStop(0.65, "#9683b717");
    aura.addColorStop(1, "#8171a000");
    c.fillStyle = aura;
    c.fillRect(0, 0, 900, 700);
    c.strokeStyle = "#c8b2e61b";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(450, 307, 238, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(450, 307, 251, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      c.beginPath();
      c.moveTo(450 + 243 * Math.cos(a), 307 + 243 * Math.sin(a));
      c.lineTo(450 + 251 * Math.cos(a), 307 + 251 * Math.sin(a));
      c.stroke();
    }
    for (let side = 0; side < 2; side++) {
      c.save();
      if (side) {
        c.translate(900, 0);
        c.scale(-1, 1);
      }
      c.fillStyle = "#171f2c";
      c.beginPath();
      c.moveTo(0, 170);
      c.bezierCurveTo(120, 255, 66, 447, 210, 580);
      c.lineTo(0, 700);
      c.closePath();
      c.fill();
      c.fillStyle = "#242b3d";
      for (let j = 0; j < 8; j++) {
        c.beginPath();
        c.ellipse(30 + j * 13, 360 + j * 28, 20, 75, -0.4, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    for (let i = 0; i < 75; i++) {
      const x = (Math.sin(i * 128.3) * 0.5 + 0.5) * 900,
        y = (Math.sin(i * 79.1) * 0.5 + 0.5) * 560;
      c.fillStyle = `rgba(238,222,255,${0.15 + (i % 4) * 0.12})`;
      c.beginPath();
      c.arc(x, y, i % 5 === 0 ? 1.5 : 0.7, 0, 7);
      c.fill();
    }
    const backdrop = new Sprite(Texture.from(back));
    this.app.stage.addChild(backdrop, this.world);
    const platform = new Graphics()
      .ellipse(384, 531, 247, 58)
      .fill({ color: 0x121c28, alpha: 0.7 })
      .ellipse(384, 515, 218, 48)
      .fill(0x3d3d50)
      .ellipse(384, 504, 218, 45)
      .fill(0x575269)
      .ellipse(384, 500, 210, 41)
      .stroke({ color: 0xaa93be, width: 2, alpha: 0.6 })
      .ellipse(384, 500, 185, 32)
      .stroke({ color: 0xdbbfdd, width: 1, alpha: 0.35 })
      .ellipse(384, 500, 152, 24)
      .fill({ color: 0xc2a8df, alpha: 0.08 })
      .ellipse(384, 500, 134, 20)
      .stroke({ color: 0xe9cdb9, width: 1, alpha: 0.35 });
    this.world.addChild(platform);
    const shadow = new Graphics()
      .ellipse(384, 490, 95, 18)
      .fill({ color: 0x171525, alpha: 0.4 });
    this.world.addChild(shadow, this.creature);
    this.egg = new Sprite(await Assets.load("/assets/egg.png"));
    this.egg.anchor.set(0.5);
    this.egg.position.set(384, 300);
    this.egg.width = 490;
    this.egg.height = 490;
    this.world.addChild(this.egg);
    this.cracks
      .moveTo(-26, -112)
      .lineTo(-10, -75)
      .lineTo(-24, -46)
      .lineTo(7, -16)
      .lineTo(-4, 13)
      .lineTo(27, 49)
      .lineTo(14, 83)
      .stroke({ width: 3, color: 0xffefd5 })
      .moveTo(7, -16)
      .lineTo(44, -40)
      .lineTo(72, -34)
      .lineTo(102, -62)
      .stroke({ width: 2, color: 0xffefd5 })
      .moveTo(-4, 13)
      .lineTo(-45, 35)
      .lineTo(-69, 29)
      .lineTo(-107, 48)
      .stroke({ width: 2, color: 0xffefd5 });
    this.cracks.position.set(384, 300);
    this.cracks.visible = false;
    this.world.addChild(this.cracks);
    for (let i = 0; i < 9; i++) {
      const shard = new Graphics()
        .poly([-12, -18, 18, -7, 8, 22, -14, 6])
        .fill(i % 2 ? 0xdac6eb : 0xab92c1)
        .stroke({ color: 0xf2dded, width: 1 });
      shard.visible = false;
      this.shards.push(shard);
      this.world.addChild(shard);
    }
    const dot = new Graphics().circle(0, 0, 2).fill(0xffe6c0);
    const dotTexture = this.app.renderer.generateTexture(dot);
    dot.destroy();
    for (let i = 0; i < 35; i++) {
      const s = new Sprite(dotTexture);
      s.anchor.set(0.5);
      this.particles.push(s);
      this.world.addChild(s);
    }
    this.creature.addChild(this.debug);
    const resize = () => {
      backdrop.width = host.clientWidth;
      backdrop.height = host.clientHeight;
      const scale = Math.min(host.clientWidth / 680, host.clientHeight / 570);
      this.world.scale.set(scale);
      this.world.position.set(
        host.clientWidth / 2 - 384 * scale,
        host.clientHeight / 2 - 300 * scale - 24,
      );
    };
    this.observer = new ResizeObserver(resize);
    this.observer.observe(host);
    resize();
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = new Rectangle(-10000, -10000, 20000, 20000);
    this.app.stage.on("pointermove", (e) => {
      if (this.drag < 0 || !this.rig || !this.mesh) return;
      const p = this.mesh.toLocal(e.global);
      this.rig.points[this.drag].x = Math.max(
        0,
        Math.min(this.rig.width - 1, p.x),
      );
      this.rig.points[this.drag].y = Math.max(
        0,
        Math.min(this.rig.height - 1, p.y),
      );
      this.prepared = prepareDeformation(this.prepared!.rest, this.rig);
      this.drawHandles();
    });
    this.app.stage.on("pointerup", () => {
      if (this.drag >= 0 && this.rig) this.onRigChanged(this.rig);
      this.drag = -1;
    });
    this.app.stage.on("pointerupoutside", () => {
      this.drag = -1;
    });
    this.app.ticker.maxFPS = 60;
    this.app.ticker.add((t) => this.step(Math.min(t.deltaMS, 50) / 1000));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden || !host.checkVisibility()) this.app.stop();
      else this.app.start();
    });
  }
  async loadCreature(image: string, rig: Rig) {
    const tex = await Assets.load(image);
    if (this.mesh) {
      this.mesh.destroy();
      if (this.assetKey.startsWith("data:") && this.assetKey !== image)
        await Assets.unload(this.assetKey);
    }
    this.assetKey = image;
    const mesh = new MeshPlane({ texture: tex, verticesX: 25, verticesY: 25 });
    this.mesh = mesh;
    this.creature.addChildAt(mesh, 0);
    this.rig = structuredClone(rig);
    this.prepared = prepareDeformation(
      mesh.geometry.getBuffer("aPosition").data as Float32Array,
      this.rig,
    );
    this.creature.scale.set(460 / rig.width);
    this.creature.position.set(
      384 - 230,
      490 - rig.height * (460 / rig.width) * 0.85,
    );
    this.creature.visible = false;
    this.drawHandles();
  }
  setMode(mode: SceneMode) {
    this.mode = mode;
    if (mode === "hatching") this.hatchTime = 0;
    this.egg.visible = mode !== "monster";
    this.creature.visible = mode === "monster";
  }
  setRig(rig: Rig) {
    this.rig = structuredClone(rig);
    if (this.prepared)
      this.prepared = prepareDeformation(this.prepared.rest, this.rig);
    this.drawHandles();
  }
  edit(value: boolean) {
    this.editing = value;
    this.drawHandles();
  }
  private drawHandles() {
    this.debug.removeChildren().forEach((x) => x.destroy());
    if (!this.editing || !this.rig) return;
    this.rig.points.forEach((p, i) => {
      const circle = new Graphics()
        .circle(0, 0, p.radius)
        .stroke({ width: 1.5, color: 0xf0d7ff, alpha: 0.3 })
        .circle(0, 0, 13)
        .fill(0xcab0ff)
        .stroke({ width: 2, color: 0xffffff });
      circle.position.set(p.x, p.y);
      circle.eventMode = "static";
      circle.cursor = "grab";
      circle.hitArea = new Rectangle(-22, -22, 44, 44);
      circle.on("pointerdown", (e) => {
        e.stopPropagation();
        this.drag = i;
      });
      const label = new Text({
        text: String(i + 1),
        style: {
          fontSize: 17,
          fontFamily: "sans-serif",
          fill: 0x282238,
          fontWeight: "bold",
        },
      });
      label.anchor.set(0.5);
      circle.addChild(label);
      this.debug.addChild(circle);
    });
    for (const p of this.rig.anchors)
      this.debug.addChild(
        new Graphics()
          .rect(p.x - 7, p.y - 7, 14, 14)
          .fill(0x91e3bd)
          .stroke({ color: 0xffffff, width: 2 }),
      );
  }
  step(dt: number) {
    if (this.paused && this.mode !== "hatching") return;
    if (!this.paused) this.time += dt;
    const t = this.time;
    let burst = 0;
    if (this.mode === "hatching") {
      this.hatchTime += dt;
      const h = this.hatchTime;
      burst = h > 1.4 ? Math.min(1, (h - 1.4) / 1.4) : 0;
      this.egg.rotation = this.reduced
        ? 0
        : Math.sin(h * 35) * 0.035 * Math.min(3, h * 2);
      this.egg.alpha = 1 - burst;
      this.egg.scale.set((490 / 768) * (1 + burst * 0.22));
      if (h > 2.8) {
        this.egg.alpha = 1;
        this.egg.rotation = 0;
        this.egg.scale.set(490 / 768);
        this.setMode("monster");
        this.onHatched();
      }
    } else {
      this.egg.rotation = this.reduced
        ? 0
        : Math.sin(t * (this.mode === "incubating" ? 5 : 1.2)) *
          (this.mode === "incubating" ? 0.045 : 0.016);
      this.egg.y = 300 + (this.reduced ? 0 : Math.sin(t * 1.5) * 5);
    }
    this.cracks.visible = this.mode === "hatching" && this.hatchTime > 0.45;
    this.cracks.alpha = (1 - burst) * Math.min(1, this.hatchTime);
    this.cracks.rotation = this.egg.rotation;
    this.shards.forEach((s, i) => {
      const a = i * 2.399;
      s.visible = this.mode === "hatching" && burst > 0 && !this.reduced;
      s.position.set(
        384 + Math.cos(a) * (50 + burst * 170),
        300 + Math.sin(a) * (60 + burst * 130) + burst * burst * 70,
      );
      s.rotation = a + burst * 2;
      s.alpha = 1 - burst;
      s.scale.set(1 - burst * 0.5);
    });
    if (this.mode === "monster" && this.mesh && this.rig && this.prepared) {
      const buffer = this.mesh.geometry.getBuffer("aPosition");
      deform(
        buffer.data as Float32Array,
        this.prepared.rest,
        this.prepared.weights,
        this.rig,
        t,
        this.reduced ? 0 : this.strength,
      );
      buffer.update();
    }
    for (let i = 0; i < this.particles.length; i++) {
      const s = this.particles[i],
        a = i * 2.399 + t * 0.06,
        r = 100 + (i % 9) * 16 + burst * 150;
      s.position.set(
        384 + Math.cos(a) * r,
        310 +
          Math.sin(a * 1.7) * 160 -
          ((t * (6 + (i % 7))) % 90) +
          burst * Math.sin(a) * 100,
      );
      s.alpha = this.reduced
        ? 0.15
        : (0.2 + 0.5 * Math.sin(t * 0.8 + i) ** 2) *
          (this.mode === "hatching" ? 1 : 0.55);
      s.scale.set(1 + (i % 3) * 0.3 + burst * 1.5);
    }
  }
}
