/**
 * Prueba sin navegador: construye TODOS los personajes con TODOS los
 * accesorios para cazar errores de geometria antes de abrir el juego.
 *
 * Uso:  node test-models.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "public", "js");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const storage = {};
const sandbox = {
  console,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  },
  document: {
    createElement: () => ({ getContext: () => null, width: 0, height: 0 }),
    createElementNS: () => ({})
  }
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

function run(src, name) {
  try {
    vm.runInContext(src, sandbox, { filename: name });
  } catch (e) {
    console.error("FALLO al cargar " + name + ": " + e.stack);
    process.exit(1);
  }
}

run(fs.readFileSync(path.join(__dirname, "public", "vendor", "three.min.js"), "utf8"), "three.min.js");
if (!sandbox.THREE) {
  console.error("FALLO: THREE no se cargo.");
  process.exit(1);
}
run(read("accessories.js"), "accessories.js");
run(read("models3d.js"), "models3d.js");

const { CHARACTERS, Models3D, Acc, ACCESSORIES, ACCESSORY_CATS } = sandbox;

let checks = 0;
let fails = 0;

function check(cond, msg) {
  checks++;
  if (!cond) {
    fails++;
    console.error("  ✗ " + msg);
  }
}

/* ---------- catalogo ---------- */
check(CHARACTERS.length >= 27, "deberia haber al menos 27 personajes (hay " + CHARACTERS.length + ")");
check(ACCESSORIES.length >= 40, "deberia haber al menos 40 accesorios (hay " + ACCESSORIES.length + ")");

const ids = new Set();
ACCESSORIES.forEach((a) => {
  check(!ids.has(a.id), "id duplicado: " + a.id);
  ids.add(a.id);
  check(ACCESSORY_CATS.some((c) => c.id === a.cat), a.id + " tiene categoria desconocida: " + a.cat);
  check(typeof a.name === "string" && a.name.length > 0, a.id + " sin nombre");
  check(typeof a.emoji === "string" && a.emoji.length > 0, a.id + " sin emoji");
});

const byCat = {};
ACCESSORY_CATS.forEach((c) => { byCat[c.id] = ACCESSORIES.filter((a) => a.cat === c.id).length; });
Object.keys(byCat).forEach((k) => {
  check(byCat[k] >= 4, "la categoria " + k + " tiene pocos accesorios (" + byCat[k] + ")");
});

/* ---------- sin accesorios ---------- */
CHARACTERS.forEach((c) => {
  try {
    const built = Models3D.buildHero(c, null);
    check(!!built.group && !!built.parts, c.id + ": falta group/parts");
    check(!!built.parts.head && !!built.parts.torso, c.id + ": falta head/torso");
    checks++;
  } catch (e) {
    fails++;
    console.error("  ✗ " + c.id + " sin accesorios lanzó: " + e.message);
  }
});

/* ---------- con TODOS los accesorios, en TODOS los personajes ---------- */
ACCESSORIES.forEach((accDef) => {
  CHARACTERS.forEach((c) => {
    const acc = {};
    acc[accDef.cat] = accDef.id;
    try {
      const built = Models3D.buildHero(c, acc);
      check(!!built.group, c.id + "/" + accDef.id + ": sin group");
      if (accDef.cat === "cape") {
        check(!!built.parts.cape, c.id + "/" + accDef.id + ": parts.cape no asignada");
      }
      // nada debe quedar con material/ geometria invalida
      built.group.traverse((o) => {
        if (o.isMesh) {
          checks++;
          if (!o.geometry || !o.material) {
            fails++;
            console.error("  ✗ " + c.id + "/" + accDef.id + ": malla sin geometry/material");
          }
          const pos = o.geometry.attributes && o.geometry.attributes.position;
          if (pos) {
            for (let i = 0; i < pos.count; i++) {
              const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
              if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
                fails++;
                console.error("  ✗ " + c.id + "/" + accDef.id + ": posicion no finita en la malla");
                return;
              }
            }
          }
        }
      });
    } catch (e) {
      fails++;
      console.error("  ✗ " + c.id + "+" + accDef.id + " lanzó: " + e.message);
    }
  });
});

/* ---------- equipamiento completo (4 huecos a la vez) ---------- */
const full = {
  hat: "hat_mariachi",
  cape: "cape_rainbow",
  outfit: "out_chicken",
  face: "face_disguise"
};
CHARACTERS.forEach((c) => {
  try {
    Models3D.buildHero(c, full);
    checks++;
  } catch (e) {
    fails++;
    console.error("  ✗ combo completo en " + c.id + ": " + e.message);
  }
});

/* ---------- API de Acc ---------- */
check(Acc.sanitize(null).hat === null, "sanitize(null) deberia devolver huecos nulos");
check(Acc.sanitize({ hat: "no_existe" }).hat === null, "sanitize debe descartar ids desconocidos");
check(Acc.sanitize({ hat: "hat_crown" }).hat === "hat_crown", "sanitize debe conservar ids validos");
check(Acc.sanitize({ hat: "cape_hero" }).hat === null, "sanitize debe rechazar un accesorio de otra categoria");
Acc.clear();
Acc.set("hat", "hat_crown");
check(Acc.get("hat") === "hat_crown", "set/get de hat");
check(JSON.parse(storage["ctf3d.acc"] || "{}").hat === "hat_crown", "el equipamiento debe guardarse en localStorage");
Acc.set("hat", null);
check(Acc.get("hat") === null, "set(null) debe quitar el accesorio");
const rnd = Acc.random(1);
check(Object.keys(rnd).length === 4, "random debe devolver los 4 huecos");
Acc.clear();

/* ---------- puntos de victoria ---------- */
const mapsSrc = read("maps3d.js");
check(/WIN_SCORE:\s*3/.test(mapsSrc), "WORLD.WIN_SCORE debe ser 3");

console.log("");
console.log(fails === 0
  ? "TODO OK · " + checks + " comprobaciones · " + CHARACTERS.length + " personajes x " + ACCESSORIES.length + " accesorios"
  : "FALLOS: " + fails + " de " + checks + " comprobaciones");
process.exit(fails === 0 ? 0 : 1);
