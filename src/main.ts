import "./style.css";
import "./fonts.css";
import {
  createIcons,
  MoonStar,
  Sprout,
  Flame,
  Droplets,
  Sparkles,
  Egg,
  BookOpen,
  Settings2,
  Volume2,
  VolumeX,
  ArrowUpRight,
  Plus,
  X,
  Check,
  ChevronRight,
  Download,
  Heart,
  WandSparkles,
  RotateCcw,
  Play,
  Pause,
  SlidersHorizontal,
  Gem,
  Feather,
  Shield,
  WifiOff,
} from "lucide";
import { registerSW } from "virtual:pwa-register";
import {
  essences,
  essenceIds,
  defaultRig,
  validateRig,
  type EssenceId,
  type Companion,
} from "./shared";
import { getCompanions, saveCompanion } from "./storage";
import { HatchScene } from "./scene";
const icons = {
  MoonStar,
  Sprout,
  Flame,
  Droplets,
  Sparkles,
  Egg,
  BookOpen,
  Settings2,
  Volume2,
  VolumeX,
  ArrowUpRight,
  Plus,
  X,
  Check,
  ChevronRight,
  Download,
  Heart,
  WandSparkles,
  RotateCcw,
  Play,
  Pause,
  SlidersHorizontal,
  Gem,
  Feather,
  Shield,
  WifiOff,
};
const icon = (name: string, cls = "") =>
  `<i data-lucide="${name}" class="${cls}"></i>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const state = {
  selected: ["moon"] as EssenceId[],
  phase: "egg",
  page: "hatchery",
  current: null as Companion | null,
  collection: [] as Companion[],
  live: false,
  ready: false,
  access: "",
  sound: true,
  error: "",
  pending: null as null | {
    image: string;
    width: number;
    height: number;
    ticket: string;
  },
  seed: 0,
  editor: false,
};
const scene = new HatchScene();
let installPrompt: any = null;
let audio: AudioContext | null = null;
$("#app").innerHTML =
  `<div class="app-shell"><header class="topbar"><a class="brand" href="#" aria-label="Aetherkin hatchery" data-action="home"><span class="brand-mark">${icon("sparkles")}</span><span>Aetherkin<span class="brand-sub">A WORLD WAITING TO HATCH</span></span></a><div class="top-actions"><span class="season">${icon("moon-star")} The first awakening</span><button class="icon-button" data-action="sound" aria-label="Mute sound" id="sound-button">${icon("volume-2")}</button><button class="icon-button" data-action="settings" aria-label="Open settings">${icon("settings-2")}</button><span class="avatar">J<span></span></span></div></header>
<main><section class="page-heading"><div><div class="eyebrow"><span></span> YOUR LITTLE CORNER OF THE COSMOS</div><h1 id="page-title">The Hatchery<span>✧</span></h1><p id="page-description">A little essence. A little wonder. Someone entirely new.</p></div><button class="text-button install-button" data-action="install">${icon("download")} Take the magic with you ${icon("arrow-up-right")}</button></section>
<section class="game-layout" id="hatchery"><div class="experience"><div class="arena" id="arena"><div id="scene"></div><div class="arena-top"><span class="location-tag">${icon("sparkles")} THE SUMMONING GLADE</span><span class="mode-tag" id="mode-tag">DEMO</span></div><div class="orbital-word">a new story begins</div><div class="stage-caption" aria-live="polite"><span class="micro-label" id="stage-label">CELESTIAL ORIGIN</span><h2 id="stage-name">Moonstone egg</h2><p id="stage-description">Something wonderful stirs within.</p></div><button class="arena-tool" id="motion-button" data-action="motion" aria-label="Edit idle animation" hidden>${icon("sliders-horizontal")}</button><div class="hatch-flash" id="hatch-flash"></div></div><div class="experience-footer"><span>${icon("heart")} Every little soul is one of a kind.</span><button data-action="guide" class="text-button">How it works ${icon("arrow-up-right")}</button></div></div><aside class="ritual-panel" id="ritual"></aside></section>
<section id="collection" class="collection" hidden></section><section id="journal" class="journal" hidden></section></main>
<nav class="bottom-nav" aria-label="Game navigation"><button class="active" data-action="home">${icon("egg")}<span>Hatchery</span></button><button data-action="collection">${icon("heart")}<span>Companions</span><b id="collection-count">0</b></button><button data-action="journal">${icon("book-open")}<span>Essence journal</span></button><span class="nav-note">AETHERKIN <span>·</span> EARLY WORLDS / 001</span></nav></div><dialog id="dialog"><div id="dialog-content"></div></dialog><div id="toast" role="status"></div>`;
function refreshIcons() {
  createIcons({ icons, attrs: { "stroke-width": 1.6 } });
}
function stats() {
  const list = state.selected.map((id) => essences[id]);
  return {
    power: Math.round(list.reduce((s, e) => s + e.power, 0) / list.length),
    spirit: Math.round(list.reduce((s, e) => s + e.spirit, 0) / list.length),
    vitality: Math.round(
      list.reduce((s, e) => s + e.vitality, 0) / list.length,
    ),
  };
}
function statMarkup() {
  const s = stats();
  return `<div class="stats">${(["power", "spirit", "vitality"] as const).map((key, i) => `<div class="stat"><div>${icon(["gem", "feather", "shield"][i])}<span>${key}</span><b>${s[key]}</b></div><div class="stat-track"><span style="width:${s[key]}%;--bar:${["#d5b4ed", "#a7cbbd", "#dac69b"][i]}"></span></div></div>`).join("")}</div>`;
}
function render() {
  const e = essences[state.selected[0]],
    busy = ["incubating", "analyzing", "hatching"].includes(state.phase),
    monster = state.phase === "monster";
  document.documentElement.style.setProperty("--essence", e.color);
  $("#ritual").innerHTML =
    monster && state.current
      ? `<div class="panel-heading"><span class="eyebrow">A NEW CONNECTION</span><span class="small-glyph">✧</span></div><h2>Hello, ${escape(state.current.name)}.</h2><p class="panel-copy">${e.description} Your companion is ready for a world of little adventures.</p><div class="lineage"><span>${icon(e.icon)} ${e.type}</span>${state.selected[1] ? `<span>${icon(essences[state.selected[1]].icon)} ${essences[state.selected[1]].type}</span>` : ""}<span>${state.current.demo ? "Demo companion" : "Unique companion"}</span></div><div class="section-label">SOUL SIGNATURE <span>${e.trait}</span></div>${statMarkup()}<div class="bond-note">${icon("heart")} Safely tucked into your collection.</div><button class="primary-button" data-action="new">${icon("plus")} Hatch another soul</button><button class="secondary-button" data-action="motion">${icon("sliders-horizontal")} Explore idle movement</button>`
      : `<div class="panel-heading"><span class="eyebrow">THE ART OF POSSIBILITY</span><span class="small-glyph">✧</span></div><h2>Shape a little soul.</h2><p class="panel-copy">Choose up to two essences.<br>See who the universe sends back.</p><div class="section-label">ELEMENTAL ESSENCES <span>${state.selected.length} / 2 infused</span></div><div class="essence-grid">${essenceIds
          .map((id) => {
            const item = essences[id],
              selected = state.selected.includes(id);
            return `<button class="essence-card ${selected ? "selected" : ""}" style="--card-color:${item.color}" data-essence="${id}" aria-pressed="${selected}" ${busy ? "disabled" : ""}><span class="essence-icon">${icon(item.icon)}</span>${selected ? `<span class="selection-check">${icon("check")}</span>` : ""}<strong>${item.name}</strong><small>${item.type} essence</small></button>`;
          })
          .join(
            "",
          )}</div><div class="infusion"><span>${icon(e.icon)}</span><i></i><span class="${state.selected[1] ? "" : "empty-slot"}">${icon(state.selected[1] ? essences[state.selected[1]].icon : "plus")}</span><p>${state.selected.length === 1 ? "A pure little possibility" : "Two essences. One new story."}</p></div><div class="section-label">EGG POTENTIAL <span>${state.selected.length === 1 ? "Pure origin" : "Blended origin"}</span></div>${statMarkup()}${state.error ? `<div class="error-message" role="alert">${escape(state.error)}</div>` : ""}<button class="primary-button ${busy ? "busy" : ""}" id="hatch-button" data-action="hatch" ${busy ? "disabled" : ""}>${icon(busy ? "sparkles" : "wand-sparkles")} ${state.phase === "incubating" ? "A little soul is forming…" : state.phase === "analyzing" ? "Finding its first heartbeat…" : state.phase === "hatching" ? "A new story begins…" : state.pending ? "Retry its first heartbeat" : "Awaken your Aetherkin"} ${busy ? "" : icon("arrow-up-right")}</button><p class="generation-note">${state.live ? "A unique creature, dreamed just for you." : "Demo hatch · explore without using credits"}</p>`;
  $("#mode-tag").textContent =
    state.current && monster
      ? state.current.demo
        ? "DEMO COMPANION"
        : "AI COMPANION"
      : state.live
        ? "LIVE HATCHERY"
        : "PLAYABLE DEMO";
  $("#stage-label").textContent = monster
    ? e.trait.toUpperCase()
    : `${e.type.toUpperCase()} ORIGIN`;
  $("#stage-name").textContent =
    monster && state.current
      ? state.current.name
      : state.phase === "incubating"
        ? "Dreaming into being…"
        : state.phase === "analyzing"
          ? "A first heartbeat…"
          : state.phase === "hatching"
            ? "Hello, little one."
            : `${e.name} egg`;
  $("#stage-description").textContent = monster
    ? "A small soul. An extraordinary beginning."
    : busy
      ? state.live
        ? "The magic takes a moment. Stay a little longer."
        : "A little magic is on its way."
      : "Something wonderful stirs within.";
  $("#motion-button").hidden = !monster;
  $("#collection-count").textContent = String(state.collection.length);
  $(".arena").classList.toggle("is-hatching", state.phase === "hatching");
  refreshIcons();
}
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  window.setTimeout(() => $("#toast").classList.remove("visible"), 4000);
}
function chime(reveal = false) {
  if (!state.sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    [0, 1, 2].forEach((_, i) => {
      const osc = audio!.createOscillator(),
        gain = audio!.createGain();
      osc.type = "sine";
      osc.frequency.value = (reveal ? 523.25 : 261.63) * [1, 1.25, 1.5][i];
      gain.gain.setValueAtTime(0, audio!.currentTime);
      gain.gain.linearRampToValueAtTime(
        0.035,
        audio!.currentTime + 0.025 + i * 0.1,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio!.currentTime + 1 + i * 0.15,
      );
      osc.connect(gain);
      gain.connect(audio!.destination);
      osc.start();
      osc.stop(audio!.currentTime + 1.5);
    });
  } catch {
    /* Audio is optional on restricted browsers. */
  }
}
async function api<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hatchery-code": state.access,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(path === "generate" ? 280_000 : 120_000),
    });
  } catch {
    throw new Error(
      "The connection was interrupted. Check your internet and try again.",
    );
  }
  const result = await response
    .json()
    .catch(() => ({ error: "The hatchery is unavailable. Please try again." }));
  if (!response.ok)
    throw new Error(
      result.error || "The hatchery is resting. Please try again.",
    );
  return result;
}
async function hatch() {
  if (!["egg", "error"].includes(state.phase)) return;
  if (state.live && !navigator.onLine) {
    toast(
      "New creatures need a connection. Your saved companions are available offline.",
    );
    return;
  }
  state.error = "";
  state.phase = state.pending ? "analyzing" : "incubating";
  scene.setMode("incubating");
  render();
  chime();
  try {
    let image: string,
      rig = defaultRig();
    state.seed = state.pending
      ? state.seed
      : Math.floor(Math.random() * 2147483647);
    if (state.live) {
      const pending =
        state.pending ??
        (await api<NonNullable<typeof state.pending>>("generate", {
          essence: state.selected[0],
          secondary: state.selected[1] || null,
          seed: state.seed,
        }));
      state.pending = pending;
      state.phase = "analyzing";
      render();
      image = pending.image;
      const result = await api<{ rig: unknown }>("analyze", pending);
      rig = validateRig(result.rig, pending.width, pending.height);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 900));
      image = `/assets/companion-${state.selected[0]}.png`;
    }
    const names: Record<EssenceId, string[]> = {
      moon: ["Lumi", "Wisp", "Mallow", "Nova"],
      flora: ["Fern", "Clover", "Pip", "Moss"],
      ember: ["Cinder", "Mochi", "Flint", "Sunny"],
      tide: ["Ripple", "Nori", "Pebble", "Misty"],
    };
    state.current = {
      id: crypto.randomUUID(),
      name: names[state.selected[0]][state.seed % 4],
      essence: state.selected[0],
      secondary: state.selected[1] || null,
      image,
      rig,
      createdAt: Date.now(),
      demo: !state.live,
      seed: state.seed,
    };
    await scene.loadCreature(image, rig);
    state.pending = null;
    state.phase = "hatching";
    scene.setMode("hatching");
    render();
  } catch (error) {
    state.phase = "error";
    scene.setMode("egg");
    state.error =
      error instanceof Error
        ? error.message
        : "Something interrupted this hatch. Please try again.";
    render();
  }
}
scene.onHatched = () => {
  state.phase = "monster";
  render();
  chime(true);
  void (async () => {
    try {
      await saveCompanion(state.current!);
      state.collection = await getCompanions();
      $("#collection-count").textContent = String(state.collection.length);
    } catch {
      toast(
        "Your device could not save this companion. Keep this screen open and free some storage.",
      );
    }
  })();
};
scene.onRigChanged = (rig) => {
  if (state.current) {
    state.current.rig = structuredClone(rig);
    state.collection = state.collection.map((c) =>
      c.id === state.current!.id ? structuredClone(state.current!) : c,
    );
    void saveCompanion(state.current).catch(() =>
      toast("Could not save the updated movement points."),
    );
    updatePointList();
  }
};
function go(page: string) {
  if (
    ["incubating", "analyzing", "hatching"].includes(state.phase) &&
    page !== "hatchery"
  ) {
    toast("Your little soul is still arriving. One moment.");
    return;
  }
  state.page = page;
  $("#hatchery").hidden = page !== "hatchery";
  $("#collection").hidden = page !== "collection";
  $("#journal").hidden = page !== "journal";
  $("#page-title").innerHTML = (
    {
      hatchery: "The Hatchery<span>✧</span>",
      collection: "Your companions<span>♡</span>",
      journal: "Essence journal<span>✧</span>",
    } as Record<string, string>
  )[page];
  $("#page-description").textContent = (
    {
      hatchery: "A little essence. A little wonder. Someone entirely new.",
      collection: "Every beginning, together in one little world.",
      journal: "Get to know the magic that makes them.",
    } as Record<string, string>
  )[page];
  document
    .querySelectorAll(".bottom-nav button")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        (b.getAttribute("data-action") === "home"
          ? "hatchery"
          : b.getAttribute("data-action")) === page,
      ),
    );
  if (page === "collection") renderCollection();
  if (page === "journal") renderJournal();
  scene.paused = page !== "hatchery";
  if (page === "hatchery") scene.app.start();
  else scene.app.stop();
  refreshIcons();
}
function renderCollection() {
  $("#collection").innerHTML = state.collection.length
    ? `<div class="collection-grid">${state.collection.map((c) => `<button class="companion-card" data-companion="${c.id}" style="--card-color:${essences[c.essence].color}"><span class="card-overline">${essences[c.essence].type} ${c.demo ? "· DEMO" : ""}</span><img src="${c.image}" alt="${escape(c.name)}" width="300" height="300" loading="lazy"/><div><span><strong>${escape(c.name)}</strong><small>${essences[c.essence].trait}</small></span>${icon("arrow-up-right")}</div></button>`).join("")}</div><p class="collection-footnote">Companions are saved on this device. Clearing site data removes this collection.</p>`
    : `<div class="empty-collection">${icon("egg")}<h2>Your first little friend is waiting.</h2><p>A touch of essence is all it takes to begin.</p><button class="primary-button" data-action="home">Visit the hatchery ${icon("arrow-up-right")}</button></div>`;
}
function renderJournal() {
  $("#journal").innerHTML = `<div class="journal-grid">${essenceIds
    .map((id) => {
      const e = essences[id],
        count = state.collection.filter(
          (c) => c.essence === id || c.secondary === id,
        ).length;
      return `<article class="journal-card" style="--card-color:${e.color}"><div class="journal-icon">${icon(e.icon)}</div><span class="eyebrow">${e.type.toUpperCase()} ESSENCE</span><h2>${e.name}</h2><p>${e.description}</p><div class="journal-trait">${icon("sparkles")} ${e.trait}</div><small>${count} ${count === 1 ? "companion" : "companions"} discovered</small><button class="text-button" data-journal="${id}">Infuse this essence ${icon("arrow-up-right")}</button></article>`;
    })
    .join("")}</div>`;
}
function modal(content: string) {
  $("#dialog-content").innerHTML =
    `<button class="icon-button close-dialog" data-action="close" aria-label="Close dialog">${icon("x")}</button>${content}`;
  if (!$<HTMLDialogElement>("#dialog").open) {
    if (state.editor) $<HTMLDialogElement>("#dialog").show();
    else $<HTMLDialogElement>("#dialog").showModal();
  }
  refreshIcons();
}
function closeModal() {
  scene.edit(false);
  state.editor = false;
  $<HTMLDialogElement>("#dialog").close();
}
function settings() {
  modal(
    `<span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>A little more magic.</h2><div class="setting-row"><div><strong>Live AI hatching</strong><small>${state.ready ? "Create unique creatures with your hatchery access code." : "Demo is ready. Live hatching needs server setup."}</small></div><input type="checkbox" id="live-toggle" aria-label="Enable live AI hatching" ${state.live ? "checked" : ""} ${!state.ready ? "disabled" : ""}/></div><label class="field-label" for="access-code">Hatchery access code</label><input id="access-code" type="password" autocomplete="off" placeholder="Your private hatchery code" value="${escape(state.access)}"/><p class="settings-help">${state.ready ? "The access code stays in memory for this session." : "Set OPENROUTER_API_KEY and GAME_ACCESS_CODE in .env.local or Vercel, then restart or redeploy. API keys stay on the server."}</p><div class="setting-row"><div><strong>Gentle motion</strong><small>Reduce movement and visual effects.</small></div><input type="checkbox" id="reduced-toggle" aria-label="Reduce movement" ${scene.reduced ? "checked" : ""}/></div><div class="setting-row"><div><strong>Sound</strong><small>Soft notes to welcome a new soul.</small></div><input type="checkbox" id="sound-toggle" aria-label="Enable sound" ${state.sound ? "checked" : ""}/></div><button class="primary-button" data-action="save-settings">${icon("check")} All set</button>`,
  );
}
function motion() {
  if (!state.current) return;
  state.editor = true;
  scene.edit(true);
  modal(
    `<span class="eyebrow">A SMALL EXPERIMENT</span><h2>Its first heartbeat.</h2><p class="panel-copy">Drag the lavender handles on your companion. Mint squares keep its feet grounded.</p><label class="field-label" for="strength">Movement strength <b id="strength-value">${scene.strength.toFixed(1)}×</b></label><input id="strength" type="range" min="0" max="2" step="0.1" value="${scene.strength}"/><div id="point-list"></div><div class="motion-actions"><button class="secondary-button" data-action="pause">${icon(scene.paused ? "play" : "pause")} ${scene.paused ? "Resume" : "Pause"}</button><button class="secondary-button" data-action="export">${icon("download")} Export JSON</button></div><p class="settings-help">Pixel coordinates · top-left origin · ${state.current.rig.width} × ${state.current.rig.height}. Close this panel to keep exploring.</p>`,
  );
  $("#dialog").classList.add("motion-dialog");
  updatePointList();
}
function updatePointList() {
  if (!document.querySelector("#point-list") || !state.current) return;
  $("#point-list").innerHTML = state.current.rig.points
    .map(
      (p, i) =>
        `<div class="point-row"><span>${i + 1}</span><strong>${escape(p.label)}</strong><code>${Math.round(p.x)}, ${Math.round(p.y)}</code></div>`,
    )
    .join("");
}
function reset() {
  state.phase = "egg";
  state.current = null;
  state.pending = null;
  state.error = "";
  scene.setMode("egg");
  scene.edit(false);
  scene.paused = false;
  scene.strength = 1;
  go("hatchery");
  render();
}
async function install() {
  if (installPrompt) {
    await installPrompt.prompt();
    installPrompt = null;
  } else
    modal(
      `<span class="eyebrow">YOUR POCKET HATCHERY</span><h2>Take the magic with you.</h2><p>On Android, open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p>On iPhone, use Safari’s Share menu, then <strong>Add to Home Screen</strong>.</p><p class="settings-help">Once loaded, the demo and saved companions work offline. New AI creatures need an internet connection.</p><button class="primary-button" data-action="close">${icon("check")} Got it</button>`,
    );
}
document.addEventListener("click", async (event) => {
  const target = (event.target as Element).closest<HTMLElement>(
    "button,[data-action]",
  );
  if (!target) return;
  const action = target.dataset.action;
  if (target.dataset.essence) {
    if (!["egg", "error"].includes(state.phase)) return;
    const id = target.dataset.essence as EssenceId;
    if (state.selected.includes(id)) {
      if (state.selected.length > 1)
        state.selected = state.selected.filter((v) => v !== id);
    } else if (state.selected.length < 2) state.selected.push(id);
    else state.selected[1] = id;
    state.pending = null;
    state.error = "";
    render();
    return;
  }
  if (target.dataset.companion) {
    state.current = structuredClone(
      state.collection.find((c) => c.id === target.dataset.companion)!,
    );
    state.selected = [
      state.current.essence,
      ...(state.current.secondary ? [state.current.secondary] : []),
    ];
    try {
      await scene.loadCreature(state.current.image, state.current.rig);
      state.phase = "monster";
      scene.setMode("monster");
      go("hatchery");
      render();
    } catch {
      toast("This companion could not be loaded. Please reload and try again.");
    }
    return;
  }
  if (target.dataset.journal) {
    state.selected = [target.dataset.journal as EssenceId];
    reset();
    return;
  }
  if (action === "home") {
    event.preventDefault();
    go("hatchery");
  }
  if (action === "hatch") await hatch();
  if (action === "new") reset();
  if (action === "collection") go("collection");
  if (action === "journal") go("journal");
  if (action === "settings") settings();
  if (action === "motion") motion();
  if (action === "close") closeModal();
  if (action === "install") await install();
  if (action === "sound") {
    state.sound = !state.sound;
    $("#sound-button").innerHTML = icon(state.sound ? "volume-2" : "volume-x");
    $("#sound-button").setAttribute(
      "aria-label",
      state.sound ? "Mute sound" : "Enable sound",
    );
    refreshIcons();
  }
  if (action === "save-settings") {
    if (["incubating", "analyzing", "hatching"].includes(state.phase)) {
      toast("Let this hatch finish before changing its settings.");
      return;
    }
    state.access = $<HTMLInputElement>("#access-code").value;
    state.live = $<HTMLInputElement>("#live-toggle").checked;
    state.sound = $<HTMLInputElement>("#sound-toggle").checked;
    scene.reduced = $<HTMLInputElement>("#reduced-toggle").checked;
    state.pending = null;
    closeModal();
    render();
    $("#sound-button").innerHTML = icon(state.sound ? "volume-2" : "volume-x");
    refreshIcons();
  }
  if (action === "pause") {
    scene.paused = !scene.paused;
    target.innerHTML = `${icon(scene.paused ? "play" : "pause")} ${scene.paused ? "Resume" : "Pause"}`;
    refreshIcons();
  }
  if (action === "export" && state.current) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state.current.rig, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.current.name.toLowerCase()}-movement.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (action === "guide")
    modal(
      `<span class="eyebrow">A BEGINNER’S LITTLE GUIDE</span><h2>From a spark to a soul.</h2><div class="guide-step"><b>01</b><div><strong>Choose your essences</strong><p>Use one for a pure origin, or mix two to shape its appearance and personality.</p></div></div><div class="guide-step"><b>02</b><div><strong>Wake the egg</strong><p>In live mode, a new creature is illustrated for your egg. Demo mode uses four original sample companions.</p></div></div><div class="guide-step"><b>03</b><div><strong>Meet your companion</strong><p>Its illustration breathes through gentle mesh movement. Your collection remembers it on this device.</p></div></div><button class="primary-button" data-action="close">Let’s make a little magic ${icon("sparkles")}</button>`,
    );
});
document.addEventListener("input", (e) => {
  if ((e.target as HTMLElement).id === "strength") {
    scene.strength = Number((e.target as HTMLInputElement).value);
    $("#strength-value").textContent = `${scene.strength.toFixed(1)}×`;
  }
});
$("#dialog").addEventListener("close", () => {
  scene.edit(false);
  state.editor = false;
  $("#dialog").classList.remove("motion-dialog");
});
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = $("#dialog").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
window.addEventListener("keydown", (e) => {
  if (e.key === "f" && !(e.target instanceof HTMLInputElement)) {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }
});
window.addEventListener("offline", () =>
  toast("A quiet moment offline. Your saved companions are still here."),
);
declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}
window.render_game_to_text = () =>
  JSON.stringify({
    page: state.page,
    phase: state.phase,
    essences: state.selected,
    mode: state.live ? "live" : "demo",
    companion: state.current
      ? { name: state.current.name, rig: state.current.rig }
      : null,
    collectionCount: state.collection.length,
    paused: scene.paused,
    reducedMotion: scene.reduced,
    strength: scene.strength,
    coordinates: "image pixels, origin top-left, x right, y down",
    error: state.error,
  });
window.advanceTime = (ms) => {
  for (let i = 0; i < Math.ceil(ms / 16.667); i++)
    scene.step(Math.min(16.667, ms - i * 16.667) / 1000);
  scene.app.render();
};
render();
try {
  await scene.init($("#scene"));
} catch {
  toast(
    "The graphics engine could not start. Please try a browser with WebGL enabled.",
  );
  $("#hatch-button").setAttribute("disabled", "");
}
try {
  state.collection = await getCompanions();
} catch {
  toast(
    "Device storage is unavailable. Companions may not persist after closing.",
  );
}
try {
  const response = await fetch("/api/status");
  if (response.ok) state.ready = Boolean((await response.json()).ready);
} catch {
  /* Demo and stored companions work offline. */
}
render();
registerSW({
  onNeedRefresh() {
    toast("A fresh little world is ready. Close and reopen to update.");
  },
  onOfflineReady() {
    /* Avoid interrupting the first hatch. */
  },
});
