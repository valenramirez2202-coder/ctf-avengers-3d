/** Prueba usando el cliente WebSocket nativo de Node (no hay dudas de framing). */
const PORT = parseInt(process.argv[2] || "3000", 10);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const hostMsgs = [];
  const guestMsgs = [];

  const host = new WebSocket("ws://127.0.0.1:" + PORT + "/");
  host.onmessage = (e) => {
    console.log("HOST <<", e.data);
    hostMsgs.push(JSON.parse(e.data));
  };
  host.onerror = (e) => console.log("HOST ERROR", e.message || e.type);
  host.onclose = (e) => console.log("HOST CLOSE", e.code, e.reason);
  await new Promise((res, rej) => {
    host.onopen = res;
    setTimeout(() => rej(new Error("timeout abriendo host")), 4000);
  });
  console.log("host conectado");

  host.send(JSON.stringify({ type: "create", name: "Anfitrion", charId: "ironman", mapId: "classic" }));
  await wait(500);
  const created = hostMsgs.find((m) => m.type === "created");
  console.log(created ? "OK: sala " + created.code : "FALLO: sin codigo de sala");
  if (!created) process.exit(1);

  const guest = new WebSocket("ws://127.0.0.1:" + PORT + "/");
  guest.onmessage = (e) => {
    console.log("GUEST <<", e.data);
    guestMsgs.push(JSON.parse(e.data));
  };
  guest.onclose = (e) => console.log("GUEST CLOSE", e.code, e.reason);
  await new Promise((res, rej) => {
    guest.onopen = res;
    setTimeout(() => rej(new Error("timeout abriendo guest")), 4000);
  });
  console.log("guest conectado");

  guest.send(JSON.stringify({ type: "join", code: created.code, name: "Invitado", charId: "cap" }));
  await wait(500);
  console.log(guestMsgs.some((m) => m.type === "joined") ? "OK: invitado dentro" : "FALLO: invitado no entro");
  console.log(hostMsgs.some((m) => m.type === "guest_joined") ? "OK: host avisado" : "FALLO: host no avisado");

  host.send(JSON.stringify({ type: "start_game" }));
  await wait(400);
  const sH = hostMsgs.find((m) => m.type === "start");
  const sG = guestMsgs.find((m) => m.type === "start");
  console.log(sH && sG ? "OK: ambos reciben start (" + sH.mapId + ")" : "FALLO: start no llego a ambos");

  // enviar un "state" grande como los reales para probar el framing > 126 bytes
  const bigState = { p: {}, f: {}, sc: { red: 1, blue: 2 }, k: {}, pr: [] };
  for (let i = 0; i < 40; i++) bigState.pr.push({ x: 100 + i, y: 200 + i, t: i % 2 ? "red" : "blue" });
  host.send(JSON.stringify({ type: "relay", data: { type: "state", state: bigState } }));
  await wait(400);
  const relayed = guestMsgs.find((m) => m.type === "relay");
  console.log(relayed ? "OK: state grande relayado (" + relayed.data.state.pr.length + " proyectiles)" : "FALLO: state grande no llego");

  guest.send(JSON.stringify({ type: "relay", data: { type: "input", keys: { w: true }, aim: 2.5 } }));
  await wait(400);
  const input = hostMsgs.find((m) => m.type === "relay");
  console.log(input ? "OK: input relayado (" + JSON.stringify(input.data.keys) + ")" : "FALLO: input no llego");

  guest.close();
  await wait(400);
  console.log(hostMsgs.some((m) => m.type === "guest_left") ? "OK: host detecta salida" : "FALLO: sin aviso de salida");
  host.close();
  await wait(200);
  console.log("fin de la prueba");
  process.exit(0);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
