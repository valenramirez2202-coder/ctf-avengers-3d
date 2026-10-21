/**
 * Capa de red (multijugador).
 *
 * Modelo autoritativo del HOST:
 *   - El host simula TODO (jugadores, banderas, disparos) y manda "state".
 *   - El invitado manda "input" (teclas + acciones) ~20 veces/s.
 *   - El invitado mueve su personaje localmente para que no se note el ping
 *     y el host corrige cuando hay mucha diferencia.
 *
 * Reconexion: si el socket se cae, se reintenta con backoff y el host espera
 * al invitado. Ya no hace falta recargar la pagina, que era el gran problema
 * del codigo viejo.
 */
(function () {
  "use strict";

  var Net = {
    socket: null,
    role: null, // "host" | "guest"
    code: null,
    connected: false,
    opponentReady: false,
    room: null, // info publica de la sala
    onEvent: null, // function(type, payload)
    _retry: 0,
    _closing: false,
    _queue: []
  };

  function emit(type, payload) {
    if (typeof Net.onEvent === "function") {
      try {
        Net.onEvent(type, payload);
      } catch (e) {
        console.error("[net] onEvent error:", e);
      }
    }
  }

  function wsURL() {
    var proto = location.protocol === "https:" ? "wss://" : "ws://";
    var host = location.host;
    if (!host) host = "localhost:3000";
    return proto + host + location.pathname.replace(/[^/]*$/, "");
  }

  function raw(obj) {
    if (Net.socket && Net.socket.readyState === 1) {
      Net.socket.send(JSON.stringify(obj));
      return true;
    }
    Net._queue.push(obj);
    return false;
  }

  function flush() {
    var q = Net._queue.splice(0, Net._queue.length);
    q.forEach(function (obj) {
      raw(obj);
    });
  }

  function connect(hello) {
    Net._closing = false;
    close(false);
    var url = wsURL();
    var socket;
    try {
      socket = new WebSocket(url);
    } catch (e) {
      emit("offline", { error: String(e) });
      return;
    }
    Net.socket = socket;

    socket.onopen = function () {
      Net._retry = 0;
      Net.connected = true;
      raw(hello);
      flush();
      emit("open", { url: url });
    };

    socket.onmessage = function (ev) {
      var msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      handle(msg);
    };

    socket.onerror = function () {
      emit("offline", { url: url });
    };

    socket.onclose = function () {
      Net.connected = false;
      if (Net._closing) {
        emit("closed", {});
        return;
      }
      // reintento con backoff
      Net._retry++;
      var wait = Math.min(6000, 400 * Math.pow(1.6, Net._retry));
      emit("reconnecting", { attempt: Net._retry, wait: wait });
      setTimeout(function () {
        Net._reconnect(hello);
      }, wait);
    };
  }

  Net._reconnect = function (hello) {
    if (Net._closing) return;
    var url = wsURL();
    var socket;
    try {
      socket = new WebSocket(url);
    } catch (e) {
      Net._retry++;
      setTimeout(function () {
        Net._reconnect(hello);
      }, 2000);
      return;
    }
    Net.socket = socket;
    socket.onopen = function () {
      Net._retry = 0;
      Net.connected = true;
      raw(hello);
      flush();
      emit("reconnected", {});
    };
    socket.onmessage = function (ev) {
      var msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      handle(msg);
    };
    socket.onclose = function () {
      Net.connected = false;
      if (Net._closing) {
        emit("closed", {});
        return;
      }
      Net._retry++;
      var wait = Math.min(6000, 400 * Math.pow(1.6, Net._retry));
      emit("reconnecting", { attempt: Net._retry, wait: wait });
      setTimeout(function () {
        Net._reconnect(hello);
      }, wait);
    };
    socket.onerror = function () {
      emit("offline", { url: url });
    };
  };

  function handle(msg) {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case "created":
        Net.role = "host";
        Net.code = msg.code;
        Net.room = { code: msg.code, mapId: msg.mapId, playing: false };
        emit("created", msg);
        break;

      case "join":
        Net.role = "guest";
        Net.code = msg.code;
        emit("joining", msg);
        break;

      case "joined":
        Net.room = msg.room;
        Net.opponentReady = true;
        emit("joined", msg);
        break;

      case "guest_joined":
        Net.opponentReady = true;
        if (Net.room) {
          Net.room.guest = msg.guest;
          Net.room.playing = true;
        }
        emit("guest_joined", msg);
        break;

      case "room_update":
        Net.room = msg.room;
        emit("room_update", msg);
        break;

      case "start":
        Net.room = msg;
        emit("start", msg);
        break;

      case "relay":
        emit("relay", msg.data);
        break;

      case "guest_left":
        Net.opponentReady = false;
        if (Net.room) Net.room.playing = false;
        emit("guest_left", msg);
        break;

      case "rehosted":
        // El host se fue y este invitado hereda la sala con un codigo nuevo.
        Net.role = "host";
        Net.code = msg.code;
        emit("rehosted", msg);
        break;

      case "error":
        emit("error", msg);
        break;

      case "pong":
        emit("pong", msg);
        break;

      default:
        break;
    }
  }

  function close(notifyServer) {
    Net._closing = true;
    Net.connected = false;
    Net._queue.length = 0;
    if (Net.socket) {
      try {
        if (notifyServer && Net.socket.readyState === 1) {
          Net.socket.send(JSON.stringify({ type: "leave" }));
        }
        Net.socket.onclose = null;
        Net.socket.close();
      } catch (e) {
        /* noop */
      }
    }
    Net.socket = null;
    Net.role = null;
    Net.code = null;
    Net.opponentReady = false;
    Net.room = null;
  }

  Net.host = function (name, charId, mapId) {
    Net.role = "host";
    connect({ type: "create", name: name, charId: charId, mapId: mapId });
  };

  Net.join = function (code, name, charId) {
    Net.role = "guest";
    connect({ type: "join", code: code, name: name, charId: charId });
  };

  Net.relay = function (data) {
    raw({ type: "relay", data: data });
  };

  Net.startGame = function () {
    raw({ type: "start_game" });
  };

  Net.setChar = function (charId) {
    raw({ type: "set_char", charId: charId });
  };

  Net.close = function () {
    close(true);
  };

  Net.ping = function () {
    raw({ type: "ping", t: Date.now() });
  };

  Net.isOnline = function () {
    return !!Net.socket && Net.connected;
  };

  Net.shareLink = function (code) {
    var base = location.origin + location.pathname;
    return base + "?sala=" + encodeURIComponent(code);
  };

  /** Codigo de sala pasado por la URL (?sala=XXXXX), si lo hay. */
  Net.codeFromURL = function () {
    var m = /[?&]sala=([A-Za-z0-9]+)/.exec(location.search || "");
    return m ? m[1].toUpperCase() : "";
  };

  window.Net = Net;
})();
