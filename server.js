/**
 * Captura la Bandera - Avengers Edition 3D
 * Servidor de archivos estaticos + relay multijugador por WebSocket.
 *
 * Levanta sin dependencias externas (solo Node >= 18):
 *   node server.js            -> http://localhost:3000
 *   node server.js 8080       -> http://localhost:8080
 *   PORT=8080 node server.js  -> idem en Linux/Mac
 *
 * El .bat / run.bat usa el node que trae Laragon.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ARGV_PORT = parseInt(process.argv[2] || process.env.PORT || "3000", 10);
const PORT = Number.isFinite(ARGV_PORT) && ARGV_PORT > 0 ? ARGV_PORT : 3000;
const ROOT = path.join(__dirname, "public");
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
const CODE_LEN = 5;
const MAX_PLAYERS = 2;
const EMPTY_SERVER_TTL = 15 * 60 * 1000; // salas vacias se limpian a los 15 min

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8"
};

/* ------------------------------------------------------------------ *
 * Utilidades
 * ------------------------------------------------------------------ */

function randomCode() {
  const n = CODE_LEN;
  const bytes = crypto.randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function uniqueCode() {
  let code = randomCode();
  let guard = 0;
  while (rooms[code] && guard++ < 200) code = randomCode();
  return code;
}

function send(ws, obj) {
  if (!ws || !ws.open || ws.socket.destroyed) return false;
  try {
    ws.send(JSON.stringify(obj));
    return true;
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Servidor HTTP (archivos estaticos)
 * ------------------------------------------------------------------ */

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch (e) {
    urlPath = "/";
  }
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  const target = path.normalize(path.join(ROOT, urlPath));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Prohibido");
    return;
  }

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 No encontrado: " + urlPath);
      return;
    }
    const type = MIME[path.extname(target).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": stat.size,
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(target).pipe(res);
  });
});

/* ------------------------------------------------------------------ *
 * WebSocket (implementacion minima RFC6455)
 * Se evita la dependencia "ws" para que el proyecto funcione sin npm.
 * ------------------------------------------------------------------ */

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const sockets = new Set();

class Socket {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.open = true;
    this.fragments = [];
    this.fragmentOpcode = 0;
    this.handlers = { message: [], close: [] };
    this.meta = null; // { code, team, name } al entrar a una sala

    socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      try {
        this.drain();
      } catch (e) {
        console.error("[ws] error de protocolo:", e && e.message);
        this.destroy();
      }
    });
    socket.on("close", () => this.destroy());
    socket.on("error", () => this.destroy());
  }

  on(event, fn) {
    if (this.handlers[event]) this.handlers[event].push(fn);
    return this;
  }

  emit(event, arg) {
    (this.handlers[event] || []).forEach((fn) => {
      try {
        fn(arg);
      } catch (e) {
        console.error("[ws] handler error:", e && e.message);
      }
    });
  }

  drain() {
    for (;;) {
      const frame = readFrame(this.buffer);
      if (!frame) return;
      this.buffer = this.buffer.slice(frame.consumed);
      if (!frame.fin) {
        this.fragments.push(frame.payload);
        this.fragmentOpcode = frame.opcode;
        continue;
      }
      let payload = frame.payload;
      if (this.fragments.length) {
        payload = Buffer.concat(this.fragments.concat([payload]));
        this.fragments = [];
      }
      if (frame.opcode === 0x8) {
        this.closeGracefully();
        return;
      }
      if (frame.opcode === 0x9) {
        this.frame(0xa, payload);
        continue;
      }
      if (frame.opcode === 0xa) continue;
      if (frame.opcode === 0x1) {
        this.emit("message", payload.toString("utf8"));
      }
    }
  }

  frame(opcode, payload) {
    if (!this.open || this.socket.destroyed) return;
    const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), "utf8");
    const len = data.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | opcode;
    try {
      this.socket.write(Buffer.concat([header, data]));
    } catch (e) {
      this.destroy();
    }
  }

  send(text) {
    this.frame(0x1, text);
  }

  closeGracefully() {
    if (!this.open) return;
    this.frame(0x8, Buffer.alloc(0));
    this.open = false;
    try {
      this.socket.end();
    } catch (e) {
      /* noop */
    }
  }

  destroy() {
    if (!this.open && sockets.has(this) === false) return;
    this.open = false;
    if (sockets.has(this)) {
      sockets.delete(this);
      this.emit("close");
    }
  }
}

/** Lee un frame completo del buffer, o null si aun faltan bytes. */
function readFrame(buf) {
  if (buf.length < 2) return null;
  const b0 = buf[0];
  const b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let offset = 2;
  if (len === 126) {
    if (buf.length < offset + 2) return null;
    len = buf.readUInt16BE(offset);
    offset += 2;
  } else if (len === 127) {
    if (buf.length < offset + 8) return null;
    const big = buf.readBigUInt64BE(offset);
    if (big > BigInt(8 * 1024 * 1024)) throw new Error("frame demasiado grande");
    len = Number(big);
    offset += 8;
  }
  let mask = null;
  if (masked) {
    if (buf.length < offset + 4) return null;
    mask = buf.slice(offset, offset + 4);
    offset += 4;
  }
  if (buf.length < offset + len) return null;
  let payload = buf.slice(offset, offset + len);
  if (mask) {
    payload = Buffer.from(payload);
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  }
  return { fin, opcode, payload, consumed: offset + len };
}

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key || (req.headers.upgrade || "").toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " +
      accept +
      "\r\n\r\n"
  );
  socket.setNoDelay(true);
  // Sin timeout y sin destruir el socket al medio cerrar: el socket ya no es
  // una conexion HTTP y Node no debe aplicar reglas de keep-alive.
  socket.setTimeout(0);
  socket.allowHalfOpen = true;

  const ws = new Socket(socket);
  sockets.add(ws);
  ws.on("message", (raw) => handleMessage(ws, raw));
  ws.on("close", () => handleClose(ws));
});

/* ------------------------------------------------------------------ *
 * Salas
 * ------------------------------------------------------------------ */

/** code -> { code, host, guest, mapId, createdAt, emptySince } */
const rooms = Object.create(null);

function publicRoomInfo(room) {
  return {
    code: room.code,
    mapId: room.mapId,
    host: room.host ? { name: room.host.meta.name, charId: room.host.meta.charId } : null,
    guest: room.guest ? { name: room.guest.meta.name, charId: room.guest.meta.charId } : null,
    playing: !!(room.host && room.guest)
  };
}

function broadcast(room, obj, except) {
  [room.host, room.guest].forEach((s) => {
    if (s && s !== except) send(s, obj);
  });
}

function leaveRoom(ws, reason) {
  const code = ws.meta && ws.meta.code;
  if (!code) return;
  const room = rooms[code];
  ws.meta = null;
  if (!room) return;

  if (room.host === ws) {
    room.host = null;
    if (room.guest) send(room.guest, { type: "guest_left" });
    if (room.guest) {
      // el invitado pasa a ser el nuevo host con un codigo nuevo
      const newCode = uniqueCode();
      const guest = room.guest;
      guest.meta.team = "red";
      guest.meta.code = newCode;
      rooms[newCode] = {
        code: newCode,
        host: guest,
        guest: null,
        mapId: room.mapId,
        createdAt: Date.now(),
        emptySince: null
      };
      send(guest, { type: "rehosted", code: newCode, mapId: room.mapId, reason: reason || "host_left" });
    }
    delete rooms[code];
  } else if (room.guest === ws) {
    room.guest = null;
    send(room.host, { type: "guest_left" });
    if (!room.host) delete rooms[code];
  }
}

function handleClose(ws) {
  leaveRoom(ws, "disconnected");
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (e) {
    send(ws, { type: "error", message: "Mensaje invalido" });
    return;
  }
  if (!msg || typeof msg.type !== "string") return;

  switch (msg.type) {
    case "create": {
      leaveRoom(ws, "reconnect");
      const code = uniqueCode();
      ws.meta = {
        code: code,
        team: "red",
        name: clean(msg.name, "Jugador"),
        charId: clean(msg.charId, "ironman"),
        mapId: clean(msg.mapId, "classic")
      };
      rooms[code] = {
        code: code,
        host: ws,
        guest: null,
        mapId: ws.meta.mapId,
        createdAt: Date.now(),
        emptySince: null
      };
      send(ws, { type: "created", code: code, mapId: ws.meta.mapId });
      break;
    }

    case "join": {
      const code = String(msg.code || "").trim().toUpperCase();
      const room = rooms[code];
      if (!room) {
        send(ws, { type: "error", message: "No existe ninguna sala con ese codigo." });
        return;
      }
      if (room.host === ws || room.guest === ws) return;
      if (room.guest) {
        send(ws, { type: "error", message: "Esa sala ya tiene dos jugadores." });
        return;
      }
      ws.meta = {
        code: code,
        team: "blue",
        name: clean(msg.name, "Jugador2"),
        charId: clean(msg.charId, "cap"),
        mapId: room.mapId
      };
      room.guest = ws;
      room.emptySince = null;
      send(ws, { type: "joined", room: publicRoomInfo(room) });
      send(room.host, { type: "guest_joined", guest: { name: ws.meta.name, charId: ws.meta.charId } });
      break;
    }

    case "set_char": {
      const room = rooms[ws.meta && ws.meta.code];
      if (!room || !ws.meta) return;
      ws.meta.charId = clean(msg.charId, ws.meta.charId);
      broadcast(room, { type: "room_update", room: publicRoomInfo(room) });
      break;
    }

    case "start_game": {
      const room = rooms[ws.meta && ws.meta.code];
      if (!room || room.host !== ws) return;
      if (!room.guest) {
        send(ws, { type: "error", message: "Todavia no hay un segundo jugador." });
        return;
      }
      const startMsg = {
        type: "start",
        mapId: room.mapId,
        seed: crypto.randomInt(1, 1e9),
        players: {
          red: { name: room.host.meta.name, charId: room.host.meta.charId },
          blue: { name: room.guest.meta.name, charId: room.guest.meta.charId }
        }
      };
      send(room.host, startMsg);
      send(room.guest, startMsg);
      break;
    }

    case "relay": {
      const room = rooms[ws.meta && ws.meta.code];
      if (!room || !ws.meta) return;
      const other = room.host === ws ? room.guest : room.host;
      if (other) send(other, { type: "relay", data: msg.data });
      break;
    }

    case "leave":
      leaveRoom(ws, "left");
      break;

    case "ping":
      send(ws, { type: "pong", t: msg.t });
      break;

    default:
      send(ws, { type: "error", message: "Tipo desconocido: " + msg.type });
  }
}

function clean(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, 18).replace(/[<>]/g, "");
  return trimmed || fallback;
}

/* Limpieza de salas vacias */
setInterval(() => {
  const now = Date.now();
  Object.keys(rooms).forEach((code) => {
    const room = rooms[code];
    if (room.host && room.guest) {
      room.emptySince = null;
      return;
    }
    if (!room.emptySince) room.emptySince = now;
    if (now - room.emptySince > EMPTY_SERVER_TTL) {
      [room.host, room.guest].forEach((s) => {
        if (s) send(s, { type: "error", message: "La sala expiro por inactividad." });
      });
      delete rooms[code];
    }
  });
}, 60 * 1000).unref();

server.listen(PORT, () => {
  console.log("");
  console.log("  === CAPTURA LA BANDERA - AVENGERS EDITION 3D ===");
  console.log("  Servidor listo:  http://localhost:" + PORT);
  console.log("  Multijugador:    ws://localhost:" + PORT + "  (maximo " + MAX_PLAYERS + " jugadores por sala)");
  console.log("");
  console.log("  En Laragon abre: http://localhost:" + PORT + "  o  http://srn.test:" + PORT);
  console.log("  Para Internet usa: cloudflared tunnel --url http://localhost:" + PORT);
  console.log("");
});
