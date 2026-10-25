/**
 * Prueba sin navegador del movimiento del INVITADO en el host.
 *
 * El host recibe { keys: w/a/q/e, aim, yaw } y debe mover al rival respecto
 * al yaw de la camara de ESE jugador (no respecto a los ejes del mundo).
 *
 * Uso:  node test-input.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "public", "js");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const storage = {};
const sandbox = {
  console,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  },
  document: { createElement: () => ({ getContext: () => null }), createElementNS: () => ({}) },
  requestAnimationFrame: () => 0
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

function run(file) {
  const src = file.endsWith(".js") && fs.existsSync(path.join(__dirname, "public", file))
    ? fs.readFileSync(path.join(__dirname, "public", file), "utf8")
    : read(file);
  vm.runInContext(src, sandbox, { filename: file });
}

run("vendor/three.min.js");
run("accessories.js");
run("maps3d.js");
run("models3d.js");
run("game.js");

const { Game, WORLD } = sandbox;

let failures = 0;
function ok(cond, label) {
  console.log((cond ? "OK: " : "FALLO: ") + label);
  if (!cond) failures++;
}

function fresh() {
  Game.reset({ mapId: "classic", mode: "host", localTeam: "red", seed: 7 });
  Game.setLocalPlayer("red", "Host", "ironman", null);
  Game.setRemotePlayer("blue", "Guest", "cap", null);
  Game.running = true;
}

function stepTimes(remoteInput, n) {
  const local = { keys: {}, aim: 0, powers: {} };
  for (let i = 0; i < n; i++) Game.stepHost(local, remoteInput, 1 / 30);
}

/* --- yaw 0 (mirando al +X): W debe desplazar en +X --- */
fresh();
const p0 = { x: Game.players.blue.x, y: Game.players.blue.y };
stepTimes({ keys: { w: true }, aim: 0, yaw: 0 }, 12);
let dx = Game.players.blue.x - p0.x;
let dy = Game.players.blue.y - p0.y;
ok(dx > 5, "yaw=0 + W avanza en +X (dx=" + dx.toFixed(1) + ")");
ok(Math.abs(dy) < 1.5, "yaw=0 + W casi no se desvía en Y (dy=" + dy.toFixed(1) + ")");

/* --- yaw 0: A (atras) debe ir en -X --- */
fresh();
const p1 = { x: Game.players.blue.x, y: Game.players.blue.y };
stepTimes({ keys: { a: true }, aim: 0, yaw: 0 }, 12);
dx = Game.players.blue.x - p1.x;
dy = Game.players.blue.y - p1.y;
ok(dx < -5, "yaw=0 + A retrocede en -X (dx=" + dx.toFixed(1) + ")");

/* --- yaw 0: Q (izquierda) debe ir en -Y --- */
fresh();
const p2 = { x: Game.players.blue.x, y: Game.players.blue.y };
stepTimes({ keys: { q: true }, aim: 0, yaw: 0 }, 12);
dx = Game.players.blue.x - p2.x;
dy = Game.players.blue.y - p2.y;
ok(dy < -5, "yaw=0 + Q strafe a la izquierda en -Y (dy=" + dy.toFixed(1) + ")");
ok(Math.abs(dx) < 1.5, "yaw=0 + Q casi no avanza en X (dx=" + dx.toFixed(1) + ")");

/* --- yaw 0: E (derecha) debe ir en +Y --- */
fresh();
const p3 = { x: Game.players.blue.x, y: Game.players.blue.y };
stepTimes({ keys: { e: true }, aim: 0, yaw: 0 }, 12);
dy = Game.players.blue.y - p3.y;
ok(dy > 5, "yaw=0 + E strafe a la derecha en +Y (dy=" + dy.toFixed(1) + ")");

/* --- yaw pi/2 (mirando al +Y): W debe desplazar en +Y --- */
fresh();
const p4 = { x: Game.players.blue.x, y: Game.players.blue.y };
stepTimes({ keys: { w: true }, aim: 0, yaw: Math.PI / 2 }, 12);
dx = Game.players.blue.x - p4.x;
dy = Game.players.blue.y - p4.y;
ok(dy > 5, "yaw=90º + W avanza en +Y (dy=" + dy.toFixed(1) + ")");
ok(Math.abs(dx) < 1.5, "yaw=90º + W casi no se desvía en X (dx=" + dx.toFixed(1) + ")");

/* --- teclas sueltas: no se mueve --- */
fresh();
const p5 = { x: Game.players.blue.x, y: Game.players.blue.y };
stepTimes({ keys: {}, aim: 1.1, yaw: 1.1 }, 12);
dx = Game.players.blue.x - p5.x;
dy = Game.players.blue.y - p5.y;
ok(Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01, "sin teclas no se mueve");

/* --- compat: si un cliente viejo no manda yaw, se usa aim --- */
fresh();
const p6 = { x: Game.players.blue.x, y: Game.players.blue.y };
stepTimes({ keys: { w: true }, aim: Math.PI / 2 }, 12);
dy = Game.players.blue.y - p6.y;
ok(dy > 5, "sin yaw se usa aim como direccion (dy=" + dy.toFixed(1) + ")");

/* --- el local sigue usando la camara del host, no la del invitado --- */
fresh();
const p7 = { x: Game.players.red.x, y: Game.players.red.y };
const local = { keys: { w: true }, aim: 0, powers: {} };
for (let i = 0; i < 12; i++) Game.stepHost(local, { keys: {}, aim: 0, yaw: 0 }, 1 / 30);
const movedLocal = Math.hypot(Game.players.red.x - p7.x, Game.players.red.y - p7.y);
ok(movedLocal > 5, "el anfitrion sigue moviéndose con sus propias teclas");

ok(WORLD.WIN_SCORE === 3, "WORLD.WIN_SCORE es 3");

console.log("");
console.log(failures === 0 ? "TODO OK" : "FALLOS: " + failures);
process.exit(failures === 0 ? 0 : 1);
