/**
 * Prueba de red de los ACCESORIOS gratuitos: crear sala con accesorios,
 * unirse con accesorios, cambiar de personaje/accesorio en la sala y
 * comprobar que el "start" lleva el equipamiento de los dos jugadores.
 *
 * Uso:  node server.js 3000   (en otra terminal)   y   node test-acc-net.js
 */
"use strict";

const URL = process.argv[2] || "ws://localhost:3000";

let failures = 0;
function ok(cond, label) {
  console.log((cond ? "OK: " : "FALLO: ") + label);
  if (!cond) failures++;
}

const HOST_ACC = { hat: "hat_crown", cape: "cape_ruana", outfit: "out_chicken", face: "face_shades" };
const GUEST_ACC = { hat: "hat_party", cape: "cape_bat", outfit: "out_clown", face: "face_clownnose" };

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    ws.onopen = () => {
      console.log(name + " conectado");
      resolve(ws);
    };
    ws.onerror = (e) => reject(new Error(name + " no conecto: " + e.message));
  });
}

function once(ws, type, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout esperando " + type)), timeout);
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === type) {
        clearTimeout(timer);
        ws.removeEventListener("message", onMsg);
        resolve(msg);
      }
    };
    ws.addEventListener("message", onMsg);
  });
}

(async () => {
  const host = await connect("HOST");
  const createdP = once(host, "created");
  host.send(JSON.stringify({ type: "create", name: "Anfitrion", charId: "ironman", mapId: "classic", acc: HOST_ACC }));
  const created = await createdP;
  ok(!!created.code, "sala creada " + created.code);

  const guest = await connect("GUEST");
  const joinedP = once(guest, "joined");
  const guestJoinedP = once(host, "guest_joined");
  guest.send(JSON.stringify({ type: "join", code: created.code, name: "Invitado", charId: "cap", acc: GUEST_ACC }));
  const joined = await joinedP;
  const guestJoined = await guestJoinedP;

  ok(joined.room.host && typeof joined.room.host.acc === "object", "la sala informa los accesorios del anfitrión");
  ok(joined.room.host.acc.hat === "hat_crown", "acc del anfitrion correcto");
  ok(guestJoined.guest.acc.outfit === "out_clown", "acc del invitado viaja al anfitrion");

  // cambiar accesorios dentro de la sala
  const updP = once(host, "room_update");
  guest.send(JSON.stringify({ type: "set_char", charId: "thor", acc: { hat: "hat_viking" } }));
  const upd = await updP;
  ok(upd.room.guest.charId === "thor", "cambio de personaje en la sala");
  ok(upd.room.guest.acc.hat === "hat_viking", "cambio de accesorio en la sala");

  // basura: el servidor debe filtrarla sin romperse
  const upd2P = once(host, "room_update");
  guest.send(JSON.stringify({ type: "set_char", charId: "thor", acc: { hat: "<script>", evil: 12345, cape: "no_existe" } }));
  const upd2 = await upd2P;
  ok(upd2.room.guest.acc.hat === undefined, "se filtra un id con caracteres raros");
  ok(upd2.room.guest.acc.evil === undefined, "se filtran huecos que no son del juego");

  // vuelta a un equipamiento valido antes de empezar
  const upd3P = once(host, "room_update");
  guest.send(JSON.stringify({ type: "set_char", charId: "thor", acc: GUEST_ACC }));
  await upd3P;

  const startP1 = once(host, "start");
  const startP2 = once(guest, "start");
  host.send(JSON.stringify({ type: "start_game" }));
  const s1 = await startP1;
  const s2 = await startP2;
  ok(s1.players.red.acc && s1.players.red.acc.outfit === "out_chicken", "start lleva los accesorios del anfitrion");
  ok(s2.players.blue.acc && s2.players.blue.acc.cape === "cape_bat", "start lleva los accesorios del invitado");

  host.close();
  guest.close();
  console.log("");
  console.log(failures === 0 ? "TODO OK" : "FALLOS: " + failures);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALLO: " + e.message);
  process.exit(1);
});
