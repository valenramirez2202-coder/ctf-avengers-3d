/**
 * Interfaz: menu, personajes, salas, HUD, bucle de juego y modo 2D clasico.
 */
(function () {
  "use strict";

  var el = function (id) {
    return document.getElementById(id);
  };

  var state = {
    username: "Jugador",
    charId: "ironman",
    mapId: "classic",
    difficulty: "medium",
    gfx: "3d",
    camPref: "auto",
    quality: "high",
    zoom: 1,
    volume: 0.7,
    shake: true,
    sprites: null,
    running: false,
    lastTime: 0,
    input: { keys: {}, aim: 0, powers: { q: false, e: false, r: false, f: false } },
    remoteInput: { keys: {}, aim: 0, powers: {} },
    netAcc: 0,
    inputAcc: 0,
    killFeed: [],
    stats: { shots: 0, time: 0 }
  };

  var canvas3d = el("game3d");
  var canvas2d = el("game2d");
  var ctx2d = canvas2d.getContext("2d");

  /* ------------------------------------------------------------------ *
   * Menu
   * ------------------------------------------------------------------ */

  function status(msg, kind) {
    var s = el("status");
    s.textContent = msg || "";
    s.style.color = kind === "error" ? "#ff6688" : kind === "ok" ? "#00ffcc" : "#ffd700";
  }

  function resetToMain() {
    el("menu").style.display = "block";
    el("gameContainer").style.display = "none";
    el("mainButtons").style.display = "block";
    el("charSection").style.display = "none";
    el("mapSection").style.display = "none";
    el("joinSection").style.display = "none";
    el("botSection").style.display = "none";
    el("waitingSection").style.display = "none";
    el("endScreen").style.display = "none";
    var conf = el("btnConfirmHost");
    if (conf) conf.remove();
    stopGame();
    status("");
  }

  function buildCharGrid() {
    var grid = el("charGrid");
    grid.innerHTML = "";
    var spriteMap = {};
    if (state.sprites) {
      state.sprites.forEach(function (s) {
        spriteMap[s.id] = s.url;
      });
    }

    CHARACTERS.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "char-card" + (c.id === state.charId ? " selected" : "") + (c.skin3d ? " skin" : "");
      card.title = c.name + " · " + (CLASSES[c.klass] || CLASSES.sniper).name;

      var url = spriteMap[c.id];
      if (url) {
        var img = document.createElement("img");
        img.className = "char-icon";
        img.src = url;
        img.alt = c.name;
        card.appendChild(img);
      } else {
        var ph = document.createElement("div");
        ph.className = "char-icon fallback";
        ph.setAttribute("data-initial", c.name.charAt(0));
        card.appendChild(ph);
      }

      if (c.skin3d) {
        var badge = document.createElement("div");
        badge.className = "char-badge";
        badge.textContent = "3D";
        card.appendChild(badge);
      }

      var name = document.createElement("div");
      name.className = "char-name";
      name.textContent = c.name;
      card.appendChild(name);

      card.onclick = function () {
        state.charId = c.id;
        Array.prototype.forEach.call(document.querySelectorAll(".char-card"), function (n) {
          n.classList.remove("selected");
        });
        card.classList.add("selected");
        SFX.beep();
        if (Net.isOnline() && Net.code) Net.setChar(c.id);
      };
      grid.appendChild(card);
    });

    el("mapPreviewNote").textContent = MAPS[state.mapId].desc;
  }

  /* ------------------------------------------------------------------ *
   * Flujo de partida
   * ------------------------------------------------------------------ */

  function startGameFlow(opts) {
    el("menu").style.display = "none";
    el("charSection").style.display = "none";
    el("mapSection").style.display = "none";
    el("joinSection").style.display = "none";
    el("botSection").style.display = "none";
    el("waitingSection").style.display = "none";
    el("gameContainer").style.display = "block";
    el("endScreen").style.display = "none";

    applyGfxMode(state.gfx);
    if (state.gfx === "3d") View3D.resize();

    Game.reset({
      mapId: opts.mapId,
      mode: opts.mode,
      botDiff: state.difficulty,
      localTeam: opts.localTeam || "red",
      seed: opts.seed || (Date.now() % 100000)
    });

    var local = Game.localTeam;
    var remote = local === "red" ? "blue" : "red";
    Game.players[local].name = opts.localName || state.username;
    Game.setLocalPlayer(local, opts.localName || state.username, opts.localChar || state.charId);
    Game.players[remote].name = opts.remoteName || "Rival";
    Game.setRemotePlayer(remote, opts.remoteName || "Rival", opts.remoteChar || (local === "red" ? "cap" : "ironman"));

    if (state.gfx === "3d") View3D.rebuildAll();
    buildStanceUI();

    state.running = true;
    Game.running = true;
    state.lastTime = performance.now();
    state.stats = { shots: 0, time: 0 };
    state.killFeed = [];
    el("killfeed").innerHTML = "";
    updateScoreUI();
    updatePowerUI();
    showControlsHint();
    requestAnimationFrame(loop);
  }

  function stopGame() {
    state.running = false;
    Game.running = false;
  }

  function showControlsHint() {
    var hint = el("controlsHint");
    if (!hint) return;
    hint.classList.remove("hide");
    hint.style.display = "block";
    hint.style.opacity = "1";
    setTimeout(function () {
      hint.classList.add("hide");
      setTimeout(function () {
        hint.style.display = "none";
      }, 500);
    }, 4200);
  }

  function applyGfxMode(mode) {
    state.gfx = mode;
    if (mode === "3d") {
      canvas3d.classList.remove("hidden");
      canvas2d.classList.add("hidden");
      if (!View3D.ready) {
        var ok = View3D.init(canvas3d);
        if (!ok) {
          status("Tu navegador no soporta WebGL. Se activo el modo 2D.", "error");
          applyGfxMode("2d");
          el("gfx").value = "2d";
          return;
        }
      }
    } else {
      canvas2d.classList.remove("hidden");
      canvas3d.classList.add("hidden");
    }
  }

  /* ------------------------------------------------------------------ *
   * Entrada
   * ------------------------------------------------------------------ */

  function readKeys() {
    return {
      w: !!(state.input.keys.w || state.input.keys.arrowup),
      a: !!(state.input.keys.a || state.input.keys.arrowdown),
      q: !!(state.input.keys.q || state.input.keys.arrowleft),
      e: !!(state.input.keys.e || state.input.keys.arrowright)
    };
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = (target.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  window.addEventListener("keydown", function (e) {
    if (isTypingTarget(e.target)) return;
    var k = e.key.toLowerCase();
    state.input.keys[k] = true;

    if (!state.running) return;
    if (k === "shift") triggerPower("q");
    if (k === " " || k === "spacebar") triggerPower("e");
    if (k === "r") triggerPower("r");
    if (k === "f") triggerPower("f");
    if (k === "c") cycleCamera();
    if (k === "h") toggleFullscreen();
    if (k === "l") toggleOrbit();
    if (k === "escape") endToMenu();
    if (k === "1" || k === "2" || k === "3") {
      setClassByIndex(parseInt(k, 10) - 1);
    }
    if (["w", "a", "q", "e", " ", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", function (e) {
    state.input.keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener("blur", function () {
    state.input.keys = {};
  });

  function triggerPower(key) {
    if (key === "q") {
      if (Game.useBoost(Game.players[Game.localTeam])) SFX.boost();
    } else if (key === "e") {
      if (Game.useShield(Game.players[Game.localTeam])) SFX.shield();
    } else if (key === "r") {
      if (Game.fire(Game.players[Game.localTeam])) SFX.shoot();
    } else if (key === "f") {
      if (Game.useAbility(Game.players[Game.localTeam])) SFX.power();
    }
    state.input.powers[key] = true;
    setTimeout(function () {
      state.input.powers[key] = false;
    }, 40);
  }

  function setClassByIndex(i) {
    var team = Game.localTeam;
    var p = Game.players[team];
    var order = ["guardian", "sniper", "agile"];
    var klass = order[i];
    if (!klass || p.klass === klass) return;
    var ch = Models3D.getChar(p.charId);
    // se cambia de clase manteniendo el personaje: estilo libre
    p.klass = klass;
    var classDef = CLASSES[klass];
    p.powers.shot.maxCd = classDef.shotCd || WORLD.SHOT_CD;
    p.powers.shot.radius = classDef.shotR || WORLD.SHOT_R;
    p.powers.shot.speed = classDef.shotSpeed || WORLD.SHOT_SPEED;
    p.powers.shield.maxDur = classDef.shieldDur || WORLD.SHIELD_DUR;
    p.powers.ability.maxCd = classDef.abilityCd || 12;
    p.baseSpeed = WORLD.START_SPEED;
    SFX.beep();
    buildStanceUI();
    if (Net.isOnline() && Net.role === "guest") {
      // el cambio de clase es local; solo se sincroniza al reaparecer
    }
  }

  function buildStanceUI() {
    var p = Game.players[Game.localTeam];
    var order = ["guardian", "sniper", "agile"];
    var ids = ["st1", "st2", "st3"];
    ids.forEach(function (id, i) {
      var node = el(id);
      if (!node) return;
      var klass = CLASSES[order[i]];
      node.textContent = (i + 1) + " · " + klass.name;
      node.classList.toggle("active", p.klass === order[i]);
      node.title = klass.desc;
    });
  }

  function cycleCamera() {
    var order = ["auto", "tactical", "third", "first"];
    var i = order.indexOf(state.camPref);
    state.camPref = order[(i + 1) % order.length];
    el("camMode").value = state.camPref;
    View3D.setPref(state.camPref);
    SFX.beep();
    addFeed("Cámara: " + labelCamera(state.camPref), "gold");
  }

  function labelCamera(mode) {
    return { auto: "Automática", tactical: "Táctica", third: "Tercera persona", first: "Primera persona" }[mode] || mode;
  }

  /** Activa/desactiva la rotacion libre de camara con el boton derecho. */
  function toggleOrbit() {
    var on = View3D.toggleOrbitLock();
    var btn = el("btnOrbit");
    if (btn) btn.classList.toggle("active", on);
    SFX.beep();
    addFeed(on ? "Cámara libre ACTIVADA (botón derecho)" : "Cámara libre desactivada", "gold");
  }

  function toggleFullscreen() {
    var node = el("gameContainer");
    if (!document.fullscreenElement) {
      if (node.requestFullscreen) node.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  /* Raton: apuntar, disparar y girar la camara (boton derecho) */
  canvas3d.addEventListener("mousemove", function (e) {
    var rect = canvas3d.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    if (View3D.orbiting) {
      // Girando la camara con el boton derecho: el raton NO apunta.
      View3D.orbitBy(e.movementX || 0, e.movementY || 0);
      return;
    }
    state.input.aim = View3D.aimFromMouse(mx, my, rect.width, rect.height);
  });

  canvas3d.addEventListener("mousedown", function (e) {
    if (e.button === 2) {
      // Boton derecho: girar la camara un momento. NO se bloquea: al soltar
      // la camara vuelve a seguir al jugador suavemente.
      e.preventDefault();
      View3D.beginOrbit();
      canvas3d.classList.add("orbiting");
      return;
    }
    if (e.button !== 0) return;
    SFX.unlock();
    if (!state.running) return;
    triggerPower("r");
  });

  // Al soltar el boton derecho se detiene el giro. Si el bloqueo esta activo
  // (tecla L o boton en pantalla) la camara queda libre para girarse.
  window.addEventListener("mouseup", function (e) {
    if (e.button !== 2) return;
    View3D.orbiting = false;
    canvas3d.classList.remove("orbiting");
  });

  canvas3d.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  canvas3d.addEventListener("wheel", function (e) {
    if (!state.running) return;
    e.preventDefault();
    if (View3D.orbitLock) {
      View3D.orbitZoomBy(e.deltaY);
      return;
    }
    var next = Math.max(0.6, Math.min(1.5, state.zoom - e.deltaY * 0.0012));
    state.zoom = next;
    el("camDist").value = Math.round(next * 100);
    el("camDistOut").textContent = Math.round(next * 100) + "%";
    View3D.setZoom(next);
  }, { passive: false });

  document.addEventListener("fullscreenchange", function () {
    setTimeout(function () {
      View3D.resize();
    }, 60);
  });

  window.addEventListener("resize", function () {
    View3D.resize();
  });

  /* ------------------------------------------------------------------ *
   * Bucle principal
   * ------------------------------------------------------------------ */

  function loop(now) {
    if (!state.running) return;
    var dt = Math.min((now - state.lastTime) / 1000, 0.033);
    state.lastTime = now;
    state.stats.time += dt;

    if (Game.running) {
      if (Game.mode === "bot") {
        Game.stepBot(state.input, dt);
      } else if (Game.mode === "host") {
        Game.stepHost(state.input, state.remoteInput, dt);
        state.netAcc += dt;
        if (state.netAcc >= 0.06) {
          state.netAcc = 0;
          Net.relay({ type: "state", state: Game.packState() });
        }
      } else if (Game.mode === "guest") {
        Game.stepGuest(state.input, dt);
        state.inputAcc += dt;
        if (state.inputAcc >= 0.05) {
          state.inputAcc = 0;
          Net.relay({
            type: "input",
            keys: readKeys(),
            aim: Math.round(state.input.aim * 100) / 100,
            powers: {
              q: state.input.powers.q,
              e: state.input.powers.e,
              r: state.input.powers.r,
              f: state.input.powers.f
            }
          });
        }
      }
      consumeEvents();
    }

    if (state.gfx === "3d") {
      View3D.render(dt);
    } else {
      render2D();
    }

    updateScoreUI();
    updatePowerUI();

    if (Game.players[Game.localTeam].respawn > 0) {
      el("clock").textContent = "REAPARECIENDO " + Game.players[Game.localTeam].respawn.toFixed(1) + "s";
    } else {
      var left = Math.max(0, Math.ceil(WORLD.ROUND_TIME - Game.roundTime));
      var m = Math.floor(left / 60);
      var s = left % 60;
      el("clock").textContent = m + ":" + (s < 10 ? "0" : "") + s;
    }

    requestAnimationFrame(loop);
  }

  function consumeEvents() {
    var events = Game.drainEvents();
    events.forEach(function (ev) {
      if (ev.type === "shoot") SFX.shoot();
      else if (ev.type === "boost") SFX.boost();
      else if (ev.type === "shield") SFX.shield();
      else if (ev.type === "ability") SFX.power();
      else if (ev.type === "dash") SFX.dash();
      else if (ev.type === "blocked") {
        SFX.blocked();
      } else if (ev.type === "kill") {
        SFX.hit();
        var mine = ev.team === Game.localTeam;
        addFeed((ev.attacker || "?") + " eliminó a " + (ev.victimName || "?"), mine ? "blue" : "red");
      } else if (ev.type === "pickup") {
        SFX.pickup();
        addFeed((ev.name || "?") + " tomó la bandera " + (ev.flag === "red" ? "roja" : "azul"), "gold");
      } else if (ev.type === "return") {
        addFeed((ev.name || "?") + " devolvió su bandera", "gold");
      } else if (ev.type === "score") {
        SFX.score();
        addFeed("¡PUNTO de " + (ev.team === "red" ? "ROJO" : "AZUL") + "! " + ev.score + "/" + WORLD.WIN_SCORE, "gold");
        pulseScore(ev.team);
      } else if (ev.type === "round") {
        addFeed("Nueva ronda", "gold");
      } else if (ev.type === "timeup") {
        addFeed("Tiempo agotado: vuelta a empezar", "gold");
      } else if (ev.type === "end") {
        endGame(ev.team);
      }
    });
  }

  function pulseScore(team) {
    var node = el(team === "red" ? "scoreRed" : "scoreBlue");
    node.classList.add("pulse");
    setTimeout(function () {
      node.classList.remove("pulse");
    }, 900);
  }

  function addFeed(text, kind) {
    var feed = el("killfeed");
    var item = document.createElement("div");
    item.className = "feed-item " + (kind || "");
    item.textContent = text;
    feed.appendChild(item);
    while (feed.children.length > 5) feed.removeChild(feed.firstChild);
    setTimeout(function () {
      item.classList.add("fade");
      setTimeout(function () {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 600);
    }, 4200);
  }

  /* ------------------------------------------------------------------ *
   * HUD
   * ------------------------------------------------------------------ */

  function updateScoreUI() {
    var rName = (Game.players.red.name || "Rojo").toUpperCase();
    var bName = (Game.players.blue.name || "Azul").toUpperCase();
    el("scoreRed").innerHTML = rName + "<br>" + Game.scores.red;
    el("scoreBlue").innerHTML = bName + "<br>" + Game.scores.blue;
    el("scoreCenter").textContent = Game.scores.red + " - " + Game.scores.blue;
  }

  function updatePowerUI() {
    var p = Game.players[Game.localTeam];
    var defs = [
      { id: "p1", key: "boost", label: "Boost" },
      { id: "p2", key: "shield", label: "Escudo" },
      { id: "p3", key: "shot", label: "Disparo" },
      { id: "p4", key: "ability", label: "Habilidad" }
    ];
    defs.forEach(function (d) {
      var node = el(d.id);
      if (!node) return;
      var pow = p.powers[d.key];
      var bar = node.querySelector(".bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "bar";
        node.appendChild(bar);
      }
      var total = pow.maxCd || 1;
      var pct = pow.cd > 0 ? (1 - pow.cd / total) * 100 : 100;
      bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
      node.classList.toggle("cd", pow.cd > 0);
      node.classList.toggle("ready", pow.cd <= 0);
      node.classList.toggle("active", pow.duration > 0);
      if (pow.cd > 0) {
        node.textContent = d.label + " " + pow.cd.toFixed(1) + "s";
        node.appendChild(bar);
      } else if (pow.duration > 0) {
        node.textContent = d.label + " ACTIVO";
        node.appendChild(bar);
      } else {
        node.textContent = d.label;
        node.appendChild(bar);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Fin de partida
   * ------------------------------------------------------------------ */

  function endGame(winner) {
    state.running = false;
    var title = el("endTitle");
    var wName = winner === "red" ? Game.players.red.name : Game.players.blue.name;
    var score = Game.scores.red + " - " + Game.scores.blue;
    if (winner === Game.localTeam) {
      title.innerHTML = "¡GANASTE!<br><span style='font-size:1.3rem'>" + wName + " · " + score + "</span>";
      title.className = "winner-red";
      SFX.win();
    } else {
      title.innerHTML = "Perdiste...<br><span style='font-size:1.3rem;color:#fff'>Ganó " + wName + " · " + score + "</span>";
      title.className = "winner-blue";
      SFX.lose();
    }
    el("endStats").textContent =
      "Puntos: " + Game.scores.red + " - " + Game.scores.blue + "\n" +
      "Eliminaciones: " + Game.kills.red + " - " + Game.kills.blue + "\n" +
      "Duración: " + Math.round(state.stats.time) + "s";
    el("endScreen").style.display = "flex";
  }

  function endToMenu() {
    if (Net.isOnline()) Net.close();
    resetToMain();
  }

  /* ------------------------------------------------------------------ *
   * Modo 2D clasico (respaldo)
   * ------------------------------------------------------------------ */

  function render2D() {
    var scaleX = canvas2d.width / WORLD.W;
    var scaleY = canvas2d.height / WORLD.H;
    ctx2d.save();
    ctx2d.scale(scaleX, scaleY);
    ctx2d.clearRect(0, 0, WORLD.W, WORLD.H);
    ctx2d.fillStyle = "#0a0a18";
    ctx2d.fillRect(0, 0, WORLD.W, WORLD.H);

    ctx2d.strokeStyle = "rgba(0,255,204,0.05)";
    ctx2d.lineWidth = 1;
    for (var x = 0; x < WORLD.W; x += 40) {
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, WORLD.H);
      ctx2d.stroke();
    }
    for (var y = 0; y < WORLD.H; y += 40) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(WORLD.W, y);
      ctx2d.stroke();
    }

    ctx2d.fillStyle = "rgba(255,50,80,0.22)";
    ctx2d.fillRect(0, WORLD.H / 2 - WORLD.BASE_H / 2, WORLD.BASE_W, WORLD.BASE_H);
    ctx2d.strokeStyle = "#ff3366";
    ctx2d.lineWidth = 3;
    ctx2d.strokeRect(0, WORLD.H / 2 - WORLD.BASE_H / 2, WORLD.BASE_W, WORLD.BASE_H);
    ctx2d.fillStyle = "rgba(50,120,255,0.22)";
    ctx2d.fillRect(WORLD.W - WORLD.BASE_W, WORLD.H / 2 - WORLD.BASE_H / 2, WORLD.BASE_W, WORLD.BASE_H);
    ctx2d.strokeStyle = "#4488ff";
    ctx2d.strokeRect(WORLD.W - WORLD.BASE_W, WORLD.H / 2 - WORLD.BASE_H / 2, WORLD.BASE_W, WORLD.BASE_H);

    Game.obstacles.forEach(function (o) {
      if (o.r != null) {
        ctx2d.beginPath();
        ctx2d.arc(o.x + o.w / 2, o.y + o.h / 2, o.r, 0, Math.PI * 2);
        ctx2d.fillStyle = "#252545";
        ctx2d.fill();
        ctx2d.strokeStyle = "#5a5a8a";
        ctx2d.lineWidth = 2;
        ctx2d.stroke();
      } else {
        ctx2d.fillStyle = "#252545";
        ctx2d.fillRect(o.x, o.y, o.w, o.h);
        ctx2d.strokeStyle = "#5a5a8a";
        ctx2d.lineWidth = 2;
        ctx2d.strokeRect(o.x, o.y, o.w, o.h);
      }
    });

    var projectiles = (Game.projectiles || []).concat(Game.remoteProjectiles || []);
    projectiles.forEach(function (pr) {
      ctx2d.beginPath();
      ctx2d.arc(pr.x, pr.y, pr.r || WORLD.SHOT_R, 0, Math.PI * 2);
      ctx2d.fillStyle = pr.team === "red" ? "#ff4466" : "#44aaff";
      ctx2d.fill();
    });

    ["red", "blue"].forEach(function (team) {
      var f = Game.flags[team];
      if (f.carrier) return;
      ctx2d.beginPath();
      ctx2d.arc(f.x, f.y, WORLD.FLAG_R, 0, Math.PI * 2);
      ctx2d.fillStyle = team === "red" ? "#ff3366" : "#4488ff";
      ctx2d.fill();
      ctx2d.strokeStyle = "#fff";
      ctx2d.lineWidth = 2;
      ctx2d.stroke();
    });

    ["red", "blue"].forEach(function (team) {
      var p = Game.players[team];
      if (p.respawn > 0) return;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx2d.fillStyle = team === "red" ? "#ff4466" : "#4488ff";
      ctx2d.fill();
      ctx2d.strokeStyle = "#fff";
      ctx2d.lineWidth = 2;
      ctx2d.stroke();
      ctx2d.font = "bold 12px sans-serif";
      ctx2d.textAlign = "center";
      ctx2d.fillStyle = team === "red" ? "#ff99aa" : "#99ccff";
      ctx2d.fillText(p.name, p.x, p.y - 34);
    });

    ctx2d.restore();
  }

  /* ------------------------------------------------------------------ *
   * Arranque de UI
   * ------------------------------------------------------------------ */

  function bindMenu() {
    el("username").addEventListener("input", function () {
      state.username = el("username").value.trim() || "Jugador";
    });

    el("btnCreate").onclick = function () {
      SFX.unlock();
      el("mainButtons").style.display = "none";
      el("charSection").style.display = "block";
      el("mapSection").style.display = "block";
      var conf = document.createElement("button");
      conf.id = "btnConfirmHost";
      conf.textContent = "Crear Sala con este personaje y mapa";
      conf.onclick = startHost;
      el("charSection").appendChild(conf);
    };

    el("btnJoin").onclick = function () {
      SFX.unlock();
      el("mainButtons").style.display = "none";
      el("charSection").style.display = "block";
      el("joinSection").style.display = "block";
      var code = Net.codeFromURL();
      if (code) el("roomCode").value = code;
    };

    el("btnBot").onclick = function () {
      SFX.unlock();
      el("mainButtons").style.display = "none";
      el("charSection").style.display = "block";
      el("mapSection").style.display = "block";
      el("botSection").style.display = "block";
    };

    el("btnBack").onclick = resetToMain;
    el("btnBackBot").onclick = resetToMain;
    el("btnCancel").onclick = function () {
      Net.close();
      resetToMain();
    };
    el("btnDoJoin").onclick = function () {
      var code = el("roomCode").value.trim().toUpperCase().replace(/\s+/g, "");
      if (code.length < 4) {
        status("El código tiene 5 letras.", "error");
        return;
      }
      joinRoom(code);
    };
    el("btnStartBot").onclick = function () {
      state.difficulty = el("difficulty").value;
      startBot();
    };
    el("btnReplay").onclick = function () {
      startBot();
    };
    el("btnMenu").onclick = endToMenu;
    el("btnQuit").onclick = endToMenu;
    el("btnFull").onclick = toggleFullscreen;
    el("btnCam").onclick = cycleCamera;
    el("btnOrbit").onclick = toggleOrbit;
    el("btnPrim").onclick = function () {
      triggerPower("f");
    };

    el("btnCopyCode").onclick = function () {
      var text = el("roomInfo").textContent;
      if (!text || text === "---") return;
      copyText(text, "Código copiado. ¡Mándaselo a tu amigo!");
    };
    el("btnCopyLink").onclick = function () {
      var text = el("roomInfo").textContent;
      if (!text || text === "---") return;
      copyText(Net.shareLink(text), "Enlace copiado. Tu amigo entra directo a la sala.");
    };

    el("mapSelect").onchange = function () {
      state.mapId = el("mapSelect").value;
      el("mapPreviewNote").textContent = MAPS[state.mapId].desc;
    };

    el("camMode").onchange = function () {
      state.camPref = el("camMode").value;
      View3D.setPref(state.camPref);
    };
    el("quality").onchange = function () {
      state.quality = el("quality").value;
      localStorage.setItem("ctf3d.quality", state.quality);
      window.location.reload();
    };
    el("gfx").onchange = function () {
      applyGfxMode(el("gfx").value);
      localStorage.setItem("ctf3d.gfx", state.gfx);
    };
    el("camDist").oninput = function () {
      state.zoom = parseInt(el("camDist").value, 10) / 100;
      el("camDistOut").textContent = el("camDist").value + "%";
      View3D.setZoom(state.zoom);
    };
    el("vol").oninput = function () {
      state.volume = parseInt(el("vol").value, 10) / 100;
      el("volOut").textContent = el("vol").value + "%";
      SFX.setVolume(state.volume);
      localStorage.setItem("ctf3d.volume", String(state.volume));
    };
    el("shake").onchange = function () {
      state.shake = el("shake").checked;
      View3D.camShake = state.shake;
      localStorage.setItem("ctf3d.shake", state.shake ? "1" : "0");
    };
  }

  function copyText(text, okMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        status(okMessage, "ok");
      }, function () {
        fallbackCopy(text, okMessage);
      });
    } else {
      fallbackCopy(text, okMessage);
    }
  }

  function fallbackCopy(text, okMessage) {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      status(okMessage, "ok");
    } catch (e) {
      status("Copia manualmente: " + text, "error");
    }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------------ *
   * Online
   * ------------------------------------------------------------------ */

  function startHost() {
    state.username = el("username").value.trim() || "Jugador";
    state.mapId = el("mapSelect").value;
    status("Creando sala...");
    Net.onEvent = onNetEvent;
    Net.host(state.username, state.charId, state.mapId);
    var conf = el("btnConfirmHost");
    if (conf) conf.remove();
  }

  function joinRoom(code) {
    state.username = el("username").value.trim() || "Jugador";
    status("Conectando a la sala " + code + "...");
    Net.onEvent = onNetEvent;
    Net.join(code, state.username, state.charId);
  }

  function onNetEvent(type, payload) {
    switch (type) {
      case "open":
        status("Conectado. Esperando respuesta del servidor...");
        break;
      case "offline":
        status("No se pudo conectar al servidor multijugador. Puedes jugar vs Bot mientras tanto.", "error");
        break;
      case "reconnecting":
        status("Conexión perdida. Reintentando (" + payload.attempt + ")...", "error");
        if (state.running) Game.paused = true;
        break;
      case "reconnected":
        status("¡Conexión restablecida!", "ok");
        Game.paused = false;
        break;
      case "created":
        status("Sala " + payload.code + " lista. Comparte el código.", "ok");
        el("mainButtons").style.display = "none";
        el("charSection").style.display = "none";
        el("mapSection").style.display = "none";
        el("waitingSection").style.display = "block";
        el("roomInfo").textContent = payload.code;
        break;
      case "joining":
        status("Sala encontrada. Uniéndose...");
        break;
      case "joined":
        status("Dentro de la sala de " + payload.room.host.name + ". Esperando al anfitrión...", "ok");
        updateWaiting(null, payload.room);
        break;
      case "guest_joined":
        status("¡" + payload.guest.name + " se unió! Empezando...", "ok");
        Net.startGame();
        break;
      case "start":
        startOnlineMatch(payload);
        break;
      case "relay":
        handleRelay(payload);
        break;
      case "guest_left":
        addFeed("El rival se desconectó", "red");
        status("El rival salió. Esperando otro jugador...", "error");
        if (state.running) {
          Game.running = false;
          el("endScreen").style.display = "flex";
          el("endTitle").textContent = "El rival abandonó";
          el("endTitle").className = "winner-draw";
          el("endStats").textContent = "Vuelve al menú para crear otra sala.";
        }
        break;
      case "rehosted":
        status("El anfitrión salió. Ahora eres el anfitrión, nuevo código: " + payload.code, "ok");
        el("mainButtons").style.display = "none";
        el("waitingSection").style.display = "block";
        el("roomInfo").textContent = payload.code;
        break;
      case "error":
        status(payload.message || "Error de red", "error");
        addFeed(payload.message || "Error de red", "red");
        break;
      default:
        break;
    }
  }

  function updateWaiting() {
    // reservado para mostrar el estado de la sala mientras esperas
  }

  function startOnlineMatch(msg) {
    Net._room = msg;
    var isHost = Net.role === "host";
    var myTeam = isHost ? "red" : "blue";
    var rivalTeam = isHost ? "blue" : "red";
    startGameFlow({
      mode: isHost ? "host" : "guest",
      mapId: msg.mapId,
      seed: msg.seed,
      localTeam: myTeam,
      localName: msg.players[myTeam].name,
      localChar: msg.players[myTeam].charId,
      remoteName: msg.players[rivalTeam].name,
      remoteChar: msg.players[rivalTeam].charId
    });
    addFeed("Partida online · " + (isHost ? "eres el anfitrión" : "eres el invitado"), "gold");
  }

  function handleRelay(data) {
    if (!data || !data.type) return;
    if (data.type === "state" && Net.role === "guest") {
      Game.applyState(data.state, 1 / 30);
    } else if (data.type === "input" && Net.role === "host") {
      state.remoteInput = { keys: data.keys || {}, aim: data.aim, powers: data.powers || {} };
    }
  }

  /* ------------------------------------------------------------------ *
   * Bot
   * ------------------------------------------------------------------ */

  function startBot() {
    state.username = el("username").value.trim() || "Jugador";
    state.mapId = el("mapSelect") ? el("mapSelect").value : state.mapId;
    var botChar;
    do {
      botChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
    } while (botChar === state.charId);
    var dname = state.difficulty === "easy" ? "Fácil" : state.difficulty === "hard" ? "Difícil" : "Normal";
    startGameFlow({
      mode: "bot",
      mapId: state.mapId,
      localTeam: "red",
      localName: state.username,
      localChar: state.charId,
      remoteName: "Bot " + dname,
      remoteChar: botChar
    });
  }

  /* ------------------------------------------------------------------ *
   * Init
   * ------------------------------------------------------------------ */

  function loadSettings() {
    try {
      var q = localStorage.getItem("ctf3d.quality");
      if (q) {
        state.quality = q;
        el("quality").value = q;
      }
      var g = localStorage.getItem("ctf3d.gfx");
      if (g) {
        state.gfx = g;
        el("gfx").value = g;
      }
      var v = localStorage.getItem("ctf3d.volume");
      if (v !== null) {
        state.volume = parseFloat(v);
        el("vol").value = Math.round(state.volume * 100);
        el("volOut").textContent = Math.round(state.volume * 100) + "%";
      }
      var sh = localStorage.getItem("ctf3d.shake");
      if (sh === "0") {
        state.shake = false;
        el("shake").checked = false;
      }
    } catch (e) {
      /* localStorage puede fallar en modo privado */
    }
    SFX.setVolume(state.volume);
    View3D.camShake = state.shake;
  }

  function boot() {
    el("loaderNote").textContent = "Preparando personajes…";
    loadSettings();
    SFX.setVolume(state.volume);
    bindMenu();

    if (typeof THREE === "undefined") {
      el("loaderNote").textContent = "No se pudo cargar Three.js: se usará el modo 2D. (¿Sin Internet?)";
      state.gfx = "2d";
      el("gfx").value = "2d";
    }

    Models3D.spriteSheet(function (list) {
      state.sprites = list;
      buildCharGrid();
      var note = list ? "Listo." : "Sin hoja de sprites: se usan fichas 3D.";
      el("loaderNote").textContent = note;
      var loader = el("loader");
      loader.classList.add("gone");
      setTimeout(function () {
        loader.style.display = "none";
      }, 500);
    });

    // El modo 3D se inicializa perezosamente al empezar la primera partida.
    window.addEventListener("pointerdown", function once() {
      SFX.unlock();
      SFX.resume();
      window.removeEventListener("pointerdown", once);
    });
  }

  // Se muestran 4 poderes (Boost, Escudo, Disparo, Habilidad)
  var powersContainer = el("powers");
  if (powersContainer && !el("p4")) {
    var p4 = document.createElement("div");
    p4.className = "power ready";
    p4.id = "p4";
    p4.innerHTML = "<b>F</b> Habilidad";
    powersContainer.appendChild(p4);
  }

  window.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();
})();
