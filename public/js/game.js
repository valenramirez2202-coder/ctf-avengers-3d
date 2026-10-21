/**
 * Nucleo de simulacion: estado, movimiento, colisiones, poderes, banderas,
 * puntuacion, bot e interpolacion de red.
 *
 * Es la evolucion del motor 2D original, pero el estado ya esta listo para
 * leerse en 3D. El "mundo" sigue siendo 900x560.
 */
(function () {
  "use strict";

  var W = WORLD.W;
  var H = WORLD.H;
  var U = MapUtils;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Angulo normalizado a [-PI, PI]. */
  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function spawnPoint(team) {
    return team === "red" ? { x: 80, y: H / 2 } : { x: W - 80, y: H / 2 };
  }

  function flagHome(team) {
    return team === "red" ? { x: 50, y: H / 2 } : { x: W - 50, y: H / 2 };
  }

  function createPlayer(team) {
    var home = spawnPoint(team);
    var klass = CLASSES.sniper;
    return {
      team: team,
      name: team === "red" ? "Rojo" : "Azul",
      charId: team === "red" ? "ironman" : "cap",
      klass: klass.id,
      x: home.x,
      y: home.y,
      vx: 0,
      vy: 0,
      facingX: team === "red" ? 1 : -1,
      facingY: 0,
      aim: 0,
      speed: WORLD.START_SPEED,
      baseSpeed: WORLD.START_SPEED,
      radius: WORLD.PLAYER_R,
      carrying: null,
      stunned: 0,
      respawn: 0,
      invul: 0,
      kills: 0,
      score: 0,
      lastPickup: -99,
      lastAction: 0,
      // red de seguridad
      netX: home.x,
      netY: home.y,
      animPhase: 0,
      powers: {
        boost: { cd: 0, maxCd: WORLD.BOOST_CD, duration: 0, maxDur: WORLD.BOOST_DUR },
        shield: { cd: 0, maxCd: WORLD.SHIELD_CD, duration: 0, maxDur: WORLD.SHIELD_DUR },
        shot: { cd: 0, maxCd: WORLD.SHOT_CD, duration: 0, maxDur: 0, radius: WORLD.SHOT_R, speed: WORLD.SHOT_SPEED },
        ability: { cd: 0, maxCd: 12, duration: 0, maxDur: 0 }
      }
    };
  }

  function applyClass(player, klassId) {
    var klass = CLASSES[klassId] || CLASSES.sniper;
    player.klass = klass.id;
    player.speed = player.baseSpeed * klass.speed;
    player.powers.shot.maxCd = klass.shotCd || WORLD.SHOT_CD;
    player.powers.shot.radius = klass.shotR || WORLD.SHOT_R;
    player.powers.shot.speed = klass.shotSpeed || WORLD.SHOT_SPEED;
    player.powers.shield.maxDur = klass.shieldDur || WORLD.SHIELD_DUR;
    player.powers.ability.maxCd = klass.abilityCd || 12;
    return klass;
  }

  /* ------------------------------------------------------------------ *
   * Estado de partida
   * ------------------------------------------------------------------ */

  var Game = {
    running: false,
    mode: null, // "bot" | "host" | "guest"
    mapId: "classic",
    obstacles: [],
    players: { red: createPlayer("red"), blue: createPlayer("blue") },
    flags: {
      red: { x: 50, y: H / 2, homeX: 50, homeY: H / 2, carrier: null, bob: 0 },
      blue: { x: W - 50, y: H / 2, homeX: W - 50, homeY: H / 2, carrier: null, bob: 0 }
    },
    projectiles: [],
    effects: [],
    particles: [],
    scores: { red: 0, blue: 0 },
    kills: { red: 0, blue: 0 },
    time: 0,
    roundTime: 0,
    events: [],
    seed: 1,
    botDiff: "medium",
    localTeam: "red",
    bot: null,
    shake: 0,
    paused: false,
    endReason: ""
  };

  function pushEvent(type, data) {
    Game.events.push(Object.assign({ type: type, at: Game.time }, data || {}));
    if (Game.events.length > 40) Game.events.splice(0, Game.events.length - 40);
  }

  Game.drainEvents = function () {
    var out = Game.events;
    Game.events = [];
    return out;
  };

  /** Hash sencillo determinista para variar el entorno por partida. */
  function mulberry(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  Game.rand = mulberry(1);

  Game.reset = function (opts) {
    opts = opts || {};
    Game.mapId = opts.mapId || Game.mapId;
    Game.obstacles = U.obstaclesOf(Game.mapId);
    Game.seed = opts.seed || Game.seed;
    Game.rand = mulberry(Game.seed);
    Game.mode = opts.mode || Game.mode;
    Game.botDiff = opts.botDiff || Game.botDiff;
    Game.localTeam = opts.localTeam || Game.localTeam;
    Game.scores = { red: 0, blue: 0 };
    Game.kills = { red: 0, blue: 0 };
    Game.projectiles = [];
    Game.effects = [];
    Game.particles = [];
    Game.time = 0;
    Game.roundTime = 0;
    Game.shake = 0;
    Game.endReason = "";
    Game.paused = false;
    Game.events = [];

    ["red", "blue"].forEach(function (team) {
      var p = Game.players[team];
      var home = spawnPoint(team);
      p.x = home.x;
      p.y = home.y;
      p.netX = home.x;
      p.netY = home.y;
      p.vx = 0;
      p.vy = 0;
      p.carrying = null;
      p.stunned = 0;
      p.respawn = 0;
      p.kills = 0;
      p.score = 0;
      p.aim = team === "red" ? 0 : Math.PI;
      p.facingX = team === "red" ? 1 : -1;
      p.facingY = 0;
      p.animPhase = 0;
      Object.keys(p.powers).forEach(function (k) {
        p.powers[k].cd = 0;
        p.powers[k].duration = 0;
      });
      p.baseSpeed = WORLD.START_SPEED;
      applyClass(p, p.klass);
    });

    ["red", "blue"].forEach(function (team) {
      var f = Game.flags[team];
      var home = flagHome(team);
      f.homeX = home.x;
      f.homeY = home.y;
      f.x = home.x;
      f.y = home.y;
      f.carrier = null;
      f.bob = Game.rand() * Math.PI * 2;
    });

    if (Game.mode === "bot") {
      Game.bot = makeBot();
    } else {
      Game.bot = null;
    }
  };

  /* ------------------------------------------------------------------ *
   * Movimiento
   * ------------------------------------------------------------------ */

  function movePlayer(p, dt, ax, ay, wantAim) {
    if (p.respawn > 0) {
      p.respawn -= dt;
      if (p.respawn <= 0) {
        var home = spawnPoint(p.team);
        p.x = home.x;
        p.y = home.y;
        p.stunned = 0;
        p.speed = p.baseSpeed * getClassSpeed(p);
        p.powers.shield.duration = 0;
        // aparece protegido un instante para no morir al instante
        p.invul = WORLD.SPAWN_PROTECT;
      }
      p.vx = 0;
      p.vy = 0;
      return;
    }

    // ventana de proteccion tras aparecer
    if (p.invul > 0) p.invul = Math.max(0, p.invul - dt);

    if (p.stunned > 0) {
      p.stunned -= dt;
      p.vx = 0;
      p.vy = 0;
      if (p.stunned <= 0) p.speed = p.baseSpeed * getClassSpeed(p);
      return;
    }

    var len = Math.sqrt(ax * ax + ay * ay);
    var targetSpeed = p.baseSpeed * getClassSpeed(p);
    if (p.carrying) targetSpeed *= WORLD.SPEED_CARRY;
    if (p.powers.boost.duration > 0) targetSpeed = p.baseSpeed * WORLD.SPEED_BOOST;

    if (len > 0.001) {
      ax /= len;
      ay /= len;
      p.facingX = ax;
      p.facingY = ay;
      p.vx = ax * targetSpeed;
      p.vy = ay * targetSpeed;
      p.animPhase += dt * (6 + targetSpeed * 0.02);
    } else {
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.animPhase += dt * 1.5;
    }
    if (wantAim) p.aim = Math.atan2(p.facingY, p.facingX);

    p.speed = targetSpeed;

    var nx = p.x + p.vx * dt;
    var ny = p.y + p.vy * dt;
    var moved = U.slideMove(p.x, p.y, nx, ny, p.radius, Game.obstacles);
    p.x = moved.x;
    p.y = moved.y;

    // empuje fuera del rival (suave)
    var other = Game.players[p.team === "red" ? "blue" : "red"];
    var dx = p.x - other.x;
    var dy = p.y - other.y;
    var minD = p.radius + other.radius;
    var d2 = dx * dx + dy * dy;
    if (d2 > 0.0001 && d2 < minD * minD) {
      var d = Math.sqrt(d2);
      var push = (minD - d) / 2;
      var ux = dx / d;
      var uy = dy / d;
      p.x += ux * push;
      p.y += uy * push;
      other.x -= ux * push;
      other.y -= uy * push;
    }

    if (p.carrying) {
      var f = Game.flags[p.carrying];
      f.x = p.x;
      f.y = p.y;
      f.bob += dt * 2;
    }
  }

  function getClassSpeed(p) {
    var k = CLASSES[p.klass] || CLASSES.sniper;
    return k.speed;
  }

  function tryPickup(p) {
    if (p.carrying || p.respawn > 0 || p.stunned > 0) return;
    var enemyTeam = p.team === "red" ? "blue" : "red";
    var enemyFlag = Game.flags[enemyTeam];
    if (!enemyFlag.carrier && Math.hypot(p.x - enemyFlag.x, p.y - enemyFlag.y) < p.radius + WORLD.FLAG_R + 6) {
      enemyFlag.carrier = p.team;
      p.carrying = enemyTeam;
      p.lastPickup = Game.time;
      pushEvent("pickup", { team: p.team, name: p.name, flag: enemyTeam });
    }
    var ownFlag = Game.flags[p.team];
    if (!ownFlag.carrier && (Math.abs(ownFlag.x - ownFlag.homeX) > 1 || Math.abs(ownFlag.y - ownFlag.homeY) > 1)) {
      if (Math.hypot(p.x - ownFlag.x, p.y - ownFlag.y) < p.radius + WORLD.FLAG_R + 6) {
        ownFlag.x = ownFlag.homeX;
        ownFlag.y = ownFlag.homeY;
        ownFlag.carrier = null;
        pushEvent("return", { team: p.team, name: p.name });
      }
    }
  }

  function inOwnBase(p) {
    var cx = p.team === "red" ? 50 : W - 50;
    if (Math.hypot(p.x - cx, p.y - H / 2) < WORLD.BASE_RADIUS) return true;
    if (p.team === "red") return p.x < 95 && Math.abs(p.y - H / 2) < 90;
    return p.x > W - 95 && Math.abs(p.y - H / 2) < 90;
  }

  function checkCaptures() {
    if (!Game.running) return;
    ["red", "blue"].forEach(function (team) {
      var p = Game.players[team];
      if (!p.carrying || p.respawn > 0) return;
      if (!inOwnBase(p)) return;
      Game.scores[team]++;
      p.score++;
      pushEvent("score", { team: team, name: p.name, score: Game.scores[team] });
      Game.shake = Math.max(Game.shake, 0.9);
      if (Game.scores[team] >= WORLD.WIN_SCORE) {
        endGame(team, "score");
      } else {
        resetRound();
      }
    });
  }

  function resetRound() {
    ["red", "blue"].forEach(function (team) {
      var p = Game.players[team];
      var home = spawnPoint(team);
      p.x = home.x;
      p.y = home.y;
      p.netX = home.x;
      p.netY = home.y;
      p.carrying = null;
      p.stunned = 0;
      p.respawn = 0;
      p.invul = WORLD.SPAWN_PROTECT;
      p.vx = 0;
      p.vy = 0;
      p.speed = p.baseSpeed * getClassSpeed(p);
      var f = Game.flags[team];
      f.carrier = null;
      f.x = f.homeX;
      f.y = f.homeY;
    });
    Game.projectiles = [];
    Game.roundTime = 0;
    if (Game.bot) { Game.bot.path = null; Game.bot.pathIndex = 0; Game.bot.pathTimer = 0; }
    pushEvent("round", {});
  }

  function endGame(winner, reason) {
    Game.running = false;
    Game.endReason = reason || "score";
    pushEvent("end", { team: winner, reason: Game.endReason });
  }
  Game.endGame = endGame;

  /* ------------------------------------------------------------------ *
   * Disparos
   * ------------------------------------------------------------------ */

  function fire(player, angleOverride) {
    var pow = player.powers.shot;
    if (pow.cd > 0 || player.respawn > 0 || player.stunned > 0) return false;
    var ang = angleOverride === undefined ? player.aim : angleOverride;
    player.aim = ang;
    player.facingX = Math.cos(ang);
    player.facingY = Math.sin(ang);
    Game.projectiles.push({
      x: player.x + Math.cos(ang) * (player.radius + 8),
      y: player.y + Math.sin(ang) * (player.radius + 8),
      vx: Math.cos(ang) * pow.speed,
      vy: Math.sin(ang) * pow.speed,
      team: player.team,
      r: pow.radius,
      life: WORLD.SHOT_LIFE * (pow.speed / WORLD.SHOT_SPEED),
      trail: [],
      owner: player.name,
      delay: 0
    });
    pow.cd = pow.maxCd;
    pushEvent("shoot", { team: player.team, x: player.x, y: player.y });
    return true;
  }
  Game.fire = fire;

  function updateProjectiles(dt) {
    var list = Game.projectiles;
    for (var i = list.length - 1; i >= 0; i--) {
      var pr = list[i];
      pr.trail.push({ x: pr.x, y: pr.y });
      if (pr.trail.length > 8) pr.trail.shift();
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      if (pr.x < 0 || pr.x > W || pr.y < 0 || pr.y > H || pr.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      if (U.hitsObstacle(pr.x, pr.y, pr.r, Game.obstacles)) {
        spawnImpact(pr.x, pr.y, pr.team);
        list.splice(i, 1);
        continue;
      }
      var enemy = Game.players[pr.team === "red" ? "blue" : "red"];
      // protegido: el disparo lo atraviesa sin efecto
      if (enemy.respawn <= 0 && enemy.invul <= 0 &&
          Math.hypot(pr.x - enemy.x, pr.y - enemy.y) < enemy.radius + pr.r) {
        if (enemy.powers.shield.duration > 0) {
          pushEvent("blocked", { team: enemy.team, x: enemy.x, y: enemy.y });
        } else {
          damage(enemy, pr.team);
        }
        spawnImpact(pr.x, pr.y, pr.team);
        list.splice(i, 1);
      }
    }
  }

  function spawnImpact(x, y, team) {
    Game.effects.push({ type: "impact", x: x, y: y, team: team, t: 0, life: 0.35 });
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * Math.PI * 2;
      Game.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * (30 + Math.random() * 60),
        vy: Math.sin(a) * (30 + Math.random() * 60),
        t: 0,
        life: 0.4 + Math.random() * 0.3,
        color: team === "red" ? 0xff5577 : 0x5599ff
      });
    }
  }

  function damage(victim, attackerTeam) {
    // proteccion tras aparecer: no recibe daño ni suelta la bandera
    if (victim.invul > 0) return;
    var attacker = Game.players[attackerTeam];
    // suelta la bandera
    if (victim.carrying) {
      var f = Game.flags[victim.carrying];
      f.carrier = null;
      f.x = f.homeX;
      f.y = f.homeY;
      victim.carrying = null;
    }
    victim.powers.shield.duration = 0;
    victim.powers.boost.duration = 0;
    victim.respawn = WORLD.RESPAWN_TIME;
    victim.stunned = WORLD.STUN_TIME;
    victim.x = -999;
    victim.y = -999;
    if (attacker) {
      attacker.kills++;
      Game.kills[attackerTeam]++;
    }
    Game.shake = Math.max(Game.shake, 0.55);
    pushEvent("kill", {
      team: attackerTeam,
      victim: victim.team,
      attacker: attacker ? attacker.name : "?",
      victimName: victim.name
    });
    Game.effects.push({ type: "death", x: victim.netX, y: victim.netY, team: victim.team, t: 0, life: 0.6 });
  }

  /* ------------------------------------------------------------------ *
   * Poderes
   * ------------------------------------------------------------------ */

  function useBoost(p) {
    var pow = p.powers.boost;
    if (pow.cd > 0 || p.respawn > 0 || p.stunned > 0) return false;
    pow.duration = pow.maxDur;
    pow.cd = pow.maxCd;
    pushEvent("boost", { team: p.team, x: p.x, y: p.y });
    return true;
  }
  Game.useBoost = useBoost;

  function useShield(p) {
    var pow = p.powers.shield;
    if (pow.cd > 0 || p.respawn > 0 || p.stunned > 0) return false;
    pow.duration = pow.maxDur;
    pow.cd = pow.maxCd;
    pushEvent("shield", { team: p.team, x: p.x, y: p.y });
    return true;
  }
  Game.useShield = useShield;

  /** Habilidad definitiva del personaje (tecla F). */
  function useAbility(p) {
    var pow = p.powers.ability;
    if (pow.cd > 0 || p.respawn > 0 || p.stunned > 0) return false;
    var klass = CLASSES[p.klass] || CLASSES.sniper;
    var enemy = Game.players[p.team === "red" ? "blue" : "red"];
    pow.cd = pow.maxCd;

    if (klass.ability === "shieldburst") {
      var shield = p.powers.shield;
      shield.duration = Math.max(shield.duration, pow.maxDur * 0.75);
      shield.cd = Math.max(0, shield.cd - 2);
      pushEvent("ability", { team: p.team, x: p.x, y: p.y, kind: "shieldburst" });
      return true;
    }

    if (klass.ability === "longshot") {
      var shot = p.powers.shot;
      var oldSpeed = shot.speed;
      var oldR = shot.radius;
      var oldCd = shot.cd;
      var oldMaxCd = shot.maxCd;
      shot.speed = oldSpeed * 2.1;
      shot.radius = oldR * 1.7;
      shot.cd = 0;
      shot.maxCd = 0;
      fire(p);
      shot.speed = oldSpeed;
      shot.radius = oldR;
      shot.cd = oldCd;
      shot.maxCd = oldMaxCd;
      // el disparo especial tiene mas alcance
      var last = Game.projectiles[Game.projectiles.length - 1];
      if (last) last.life = 2.2;
      pushEvent("ability", { team: p.team, x: p.x, y: p.y, kind: "longshot" });
      return true;
    }

    if (klass.ability === "dash") {
      var ang = p.aim;
      p.powers.boost.duration = Math.max(p.powers.boost.duration, 0.9);
      var startX = p.x;
      var startY = p.y;
      var steps = 12;
      var dashLen = 240;
      for (var i = 1; i <= steps; i++) {
        var t = i / steps;
        var nx = startX + Math.cos(ang) * dashLen * t;
        var ny = startY + Math.sin(ang) * dashLen * t;
        var res = U.slideMove(p.x, p.y, nx, ny, p.radius, Game.obstacles);
        p.x = res.x;
        p.y = res.y;
        if (res.blocked) break;
      }
      p.facingX = Math.cos(ang);
      p.facingY = Math.sin(ang);
      // derriba si embiste al rival
      var d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      if (d < p.radius + enemy.radius + 26 && enemy.respawn <= 0 && enemy.invul <= 0) {
        if (enemy.powers.shield.duration > 0) {
          pushEvent("blocked", { team: enemy.team, x: enemy.x, y: enemy.y });
        } else {
          damage(enemy, p.team);
        }
      }
      pushEvent("ability", { team: p.team, x: p.x, y: p.y, kind: "dash" });
      pushEvent("dash", { team: p.team, x: startX, y: startY, x2: p.x, y2: p.y });
      return true;
    }
    return false;
  }
  Game.useAbility = useAbility;

  function updatePowers(dt) {
    ["red", "blue"].forEach(function (team) {
      var p = Game.players[team];
      Object.keys(p.powers).forEach(function (k) {
        var pow = p.powers[k];
        if (pow.cd > 0) pow.cd = Math.max(0, pow.cd - dt);
        if (pow.duration > 0) pow.duration = Math.max(0, pow.duration - dt);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Efectos
   * ------------------------------------------------------------------ */

  function updateEffects(dt) {
    for (var i = Game.effects.length - 1; i >= 0; i--) {
      var e = Game.effects[i];
      e.t += dt;
      if (e.t >= e.life) Game.effects.splice(i, 1);
    }
    for (var j = Game.particles.length - 1; j >= 0; j--) {
      var pt = Game.particles[j];
      pt.t += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      if (pt.t >= pt.life) Game.particles.splice(j, 1);
    }
    if (Game.shake > 0) Game.shake = Math.max(0, Game.shake - dt * 2.4);
  }

  function updateFlagsBobbing(dt) {
    ["red", "blue"].forEach(function (t) {
      Game.flags[t].bob += dt * 2.2;
    });
  }

  /* ------------------------------------------------------------------ *
   * Bot
   * ------------------------------------------------------------------ */

  function makeBot() {
    return {
      stuck: 0,
      side: 1,
      powerTimer: 0.4,
      strafe: Math.random() < 0.5 ? 1 : -1,
      lastSeen: -99,
      seekFlag: null,
      panic: 0,
      path: null,
      pathIndex: 0,
      pathTimer: 0,
      goalX: 0,
      goalY: 0,
      lastProgressDist: 0,
      progressTimer: 0
    };
  }

  function botBlocked(x, y, r) {
    if (U.outOfBounds(x, y, r)) return true;
    return U.hitsObstacle(x, y, r, Game.obstacles);
  }

  function updateBot(dt) {
    var bot = Game.players.blue;
    var me = Game.players.red;
    if (bot.respawn > 0 || bot.stunned > 0) {
      movePlayer(bot, dt, 0, 0, true);
      return;
    }
    var brain = Game.bot;
    var diff = Game.botDiff;
    var speedMul = diff === "easy" ? 0.78 : diff === "hard" ? 1.06 : 0.92;
    var reaction = diff === "easy" ? 0.55 : diff === "hard" ? 0.16 : 0.38;

    var myFlag = Game.flags.blue;
    var enemyFlag = Game.flags.red;
    var distMe = Math.hypot(bot.x - me.x, bot.y - me.y);
    // Si el rival acaba de aparecer (protegido), el bot lo ignora: no lo
    // persigue ni lo dispara, asi el jugador puede salir del spawn.
    var playerSafe = me.invul > 0;
    var canSee = !playerSafe && !U.outOfBounds(me.x, me.y, 8) &&
      U.segmentClear(bot.x, bot.y, me.x, me.y, Game.obstacles);
    if (canSee) brain.lastSeen = Game.time;

    // ---- eleccion de objetivo ----
    var tx;
    var ty;
    if (bot.carrying) {
      tx = W - 50;
      ty = H / 2;
    } else if (me.carrying === "blue" && !playerSafe) {
      // interceptar al ladron
      var lead = 0.35;
      tx = me.x + me.vx * lead;
      ty = me.y + me.vy * lead;
    } else if (Math.abs(myFlag.x - myFlag.homeX) > 1 || Math.abs(myFlag.y - myFlag.homeY) > 1) {
      tx = myFlag.x;
      ty = myFlag.y;
    } else {
      tx = enemyFlag.x;
      ty = enemyFlag.y;
    }

    // ---- ruta con buscador de caminos (evita quedarse atascado) ----
    brain.pathTimer = (brain.pathTimer || 0) - dt;
    var needRepath = !brain.path || !brain.path.length || brain.pathTimer <= 0 ||
      Math.hypot(brain.goalX - tx, brain.goalY - ty) > 60;
    if (needRepath) {
      // Radio completo primero: la ruta debe ser transitable de verdad por el
      // personaje (si no, el bot se atasca contra las esquinas).
      var full = U.findPath(bot.x, bot.y, tx, ty, bot.radius, Game.obstacles, 20);
      if (!full) full = U.findPath(bot.x, bot.y, tx, ty, bot.radius - 4, Game.obstacles, 16);
      brain.path = full;
      brain.pathIndex = 0;
      brain.goalX = tx;
      brain.goalY = ty;
      brain.pathTimer = 0.5;
      // Reinicia el control de progreso al calcular una ruta nueva.
      brain.lastProgressDist = Math.hypot(tx - bot.x, ty - bot.y);
      brain.progressTimer = 0;
    }

    // Siguiente waypoint: se salta los ya alcanzados.
    var wptX = tx;
    var wptY = ty;
    if (brain.path && brain.path.length) {
      while (brain.pathIndex < brain.path.length - 1) {
        var wp = brain.path[brain.pathIndex];
        if (Math.hypot(wp.x - bot.x, wp.y - bot.y) < 34) brain.pathIndex++;
        else break;
      }
      var curWp = brain.path[Math.min(brain.pathIndex, brain.path.length - 1)];
      wptX = curWp.x;
      wptY = curWp.y;
      // Si hay linea de vision al waypoint siguiente, se saltara el actual.
      // Se comprueba con el radio del cuerpo: sin el, el bot "ve" a traves de
      // esquinas y se llena contra la pared intentando el atajo.
      if (brain.pathIndex < brain.path.length - 1 &&
          U.segmentClearR(bot.x, bot.y, brain.path[brain.pathIndex + 1].x, brain.path[brain.pathIndex + 1].y, bot.radius - 2, Game.obstacles)) {
        brain.pathIndex++;
        curWp = brain.path[brain.pathIndex];
        wptX = curWp.x;
        wptY = curWp.y;
      }
    }

    var dx = wptX - bot.x;
    var dy = wptY - bot.y;
    var dist = Math.hypot(dx, dy) || 1;
    var dirX = dx / dist;
    var dirY = dy / dist;

    // esquiva disparos cercanos haciendo strafe
    Game.projectiles.forEach(function (pr) {
      if (pr.team !== "red") return;
      var pd = Math.hypot(pr.x - bot.x, pr.y - bot.y);
      if (pd < 130) {
        var cross = pr.vx * (bot.y - pr.y) - pr.vy * (bot.x - pr.x);
        brain.strafe = cross > 0 ? -1 : 1;
      }
    });

    var step = bot.speed * speedMul * dt * (1 + (bot.powers.boost.duration > 0 ? 0.6 : 0));
    var nx = bot.x + dirX * step;
    var ny = bot.y + dirY * step;

    // Avance hacia el waypoint con deslizamiento por las paredes.
    var slid = U.slideMove(bot.x, bot.y, nx, ny, bot.radius, Game.obstacles);
    var movedDist = Math.hypot(slid.x - bot.x, slid.y - bot.y);
    if (movedDist > 0.05) {
      bot.x = slid.x;
      bot.y = slid.y;
      // Solo cuenta como avance si no hay bloqueo; el progreso real hacia la
      // meta se vigila aparte (abajo) para no dejarse "mover" contra un muro.
      if (!slid.blocked) brain.stuck = 0;
      // Si el waypoint ya casi esta, se pasa al siguiente.
      if (brain.path && brain.pathIndex < brain.path.length - 1 &&
          Math.hypot(wptX - bot.x, wptY - bot.y) < 26) {
        brain.pathIndex++;
      }
    } else {
      brain.stuck += dt;
      // Atasco real: forzar recalculo de ruta y, si sigue, salto corto.
      if (brain.stuck > 0.35) brain.pathTimer = 0;
      if (brain.stuck > 0.9) {
        // Escape dirigido: entre los huecos libres alrededor se elige el que
        // mas se acerca a la meta real (tx,ty). Garantiza progreso.
        var best = null;
        var bestDist = Infinity;
        var curDist = Math.hypot(tx - bot.x, ty - bot.y);
        for (var rr = 30; rr <= 120; rr += 15) {
          for (var t = 0; t < 20; t++) {
            var ang3 = t * (Math.PI / 10);
            var jx = bot.x + Math.cos(ang3) * rr;
            var jy = bot.y + Math.sin(ang3) * rr;
            if (botBlocked(jx, jy, bot.radius)) continue;
            // Debe haber linea libre hasta el punto (con el radio del cuerpo)
            // para no teletransportarse a traves de una pared.
            if (!U.segmentClearR(bot.x, bot.y, jx, jy, bot.radius - 2, Game.obstacles)) continue;
            var dToGoal = Math.hypot(tx - jx, ty - jy);
            if (dToGoal < bestDist && dToGoal < curDist) {
              bestDist = dToGoal;
              best = { x: jx, y: jy };
            }
          }
          if (best) break; // ya hay un hueco util en este anillo
        }
        if (best) {
          bot.x = best.x;
          bot.y = best.y;
          brain.stuck = 0;
          brain.pathTimer = 0;
        } else if (brain.stuck > 2.5) {
          resetRound();
        }
      }
    }

    // ---- vigilancia de progreso real hacia la meta ----
    // Si no se acerca en un tiempo, se considera atascado aunque "se mueva"
    // deslizando por un muro (evita quedarse girando durante toda la partida).
    var distToGoal = Math.hypot(tx - bot.x, ty - bot.y);
    if (distToGoal < (brain.lastProgressDist === undefined ? distToGoal : brain.lastProgressDist) - 12) {
      brain.lastProgressDist = distToGoal;
      brain.progressTimer = 0;
    } else {
      brain.progressTimer = (brain.progressTimer || 0) + dt;
      if (brain.progressTimer > 1.1) {
        // Sin avance: recalcula ruta y, si aun asi no progresa, escapa.
        brain.pathTimer = 0;
        brain.stuck = Math.max(brain.stuck, 1.0);
        brain.progressTimer = 0;
        brain.lastProgressDist = distToGoal;
      }
    }

    bot.facingX = dirX;
    bot.facingY = dirY;
    if (canSee) {
      bot.aim = Math.atan2(me.y - bot.y, me.x - bot.x);
      bot.facingX = Math.cos(bot.aim);
      bot.facingY = Math.sin(bot.aim);
    } else {
      bot.aim = Math.atan2(dirY, dirX);
    }
    bot.animPhase += dt * (6 + bot.speed * 0.02);
    bot.speed = bot.baseSpeed * getClassSpeed(bot) * speedMul;
    if (bot.carrying) {
      var f = Game.flags[bot.carrying];
      f.x = bot.x;
      f.y = bot.y;
      f.bob += dt * 2;
    }
    tryPickup(bot);

    if (brain.panic > 0) brain.panic -= dt;

    // ---- poderes ----
    brain.powerTimer -= dt;
    if (brain.powerTimer <= 0 && brain.panic <= 0) {
      brain.powerTimer = reaction + Math.random() * 0.4;

      var aimAng = Math.atan2(me.y - bot.y, me.x - bot.x);
      var angDiff = Math.abs(wrapAngle(aimAng - bot.aim));

      // habilidad definitiva en el momento justo
      if (bot.powers.ability.cd <= 0 && canSee && distMe < 420) {
        if (useAbility(bot)) return;
      }
      if (bot.powers.shot.cd <= 0 && canSee && distMe < 260 && angDiff < 0.5) {
        // imprecision segun dificultad: en normal/disparos rapidos no acierta
        // siempre, asi el jugador tiene margen de reaccion.
        var spread = diff === "easy" ? 0.22 : diff === "hard" ? 0.05 : 0.13;
        fire(bot, aimAng + (Math.random() - 0.5) * spread * 2);
      } else if (bot.powers.boost.cd <= 0 && bot.powers.boost.duration <= 0) {
        if (bot.carrying || dist > 260 || (!canSee && dist > 160)) {
          useBoost(bot);
        }
      } else if (bot.powers.shield.cd <= 0 && distMe < 130 && canSee) {
        useShield(bot);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Actualizacion por modo
   * ------------------------------------------------------------------ */

  /**
   * Movimiento relativo a la camara: W = adelante (hacia donde mira la
   * camara/raton), A = atras, Q = izquierda, E = derecha. Las flechas hacen
   * lo mismo. La camara NUNCA gira con el teclado; solo el raton la rota.
   */
  function updateLocalHuman(p, dt, keys, aim) {
    var fwd = 0;
    var strafe = 0;
    if (keys.w || keys.arrowup) fwd += 1;
    if (keys.a || keys.arrowdown) fwd -= 1;
    if (keys.q || keys.arrowleft) strafe -= 1;
    if (keys.e || keys.arrowright) strafe += 1;

    // La direccion de avance es la de la CAMARA, no la del raton. Asi al
    // pulsar W el heroe avanza exactamente hacia donde mira la pantalla y no
    // se "corra" de lado aunque el raton este en otro punto.
    var ang = (aim !== undefined && aim !== null) ? aim : (p.aim || 0);
    var camYaw = (typeof window !== "undefined" && window.View3D && View3D.getCamYaw)
      ? View3D.getCamYaw() : null;
    if (camYaw !== null && camYaw !== undefined) ang = camYaw;
    var fx = Math.cos(ang);
    var fy = Math.sin(ang);
    var rx = -fy;
    var ry = fx;

    var ax = fx * fwd + rx * strafe;
    var ay = fy * fwd + ry * strafe;
    var mag = Math.hypot(ax, ay);
    if (mag > 1) {
      ax /= mag;
      ay /= mag;
    }

    if (aim !== undefined && aim !== null) p.aim = aim;

    movePlayer(p, dt, ax, ay, false);

    // al andar mira hacia donde camina; quieto mira el raton
    if (mag > 0.01) {
      var l = Math.hypot(ax, ay) || 1;
      p.facingX = ax / l;
      p.facingY = ay / l;
    } else if (aim !== undefined && aim !== null) {
      p.facingX = fx;
      p.facingY = fy;
    }
  }

  Game.updateInput = function (input, dt) {
    var p = Game.players[Game.localTeam];
    updateLocalHuman(p, dt, input.keys || {}, input.aim);
    // recoger/devolver bandera: en modo bot esto no lo llamaba nadie, asi que
    // el jugador no podia capturar. En host/guest ya se hace a parte.
    tryPickup(p);
    if (input.powers) {
      if (input.powers.q) useBoost(p);
      if (input.powers.e) useShield(p);
      if (input.powers.r) fire(p);
      if (input.powers.f) useAbility(p);
    }
  };

  Game.stepBot = function (input, dt) {
    Game.updateInput(input, dt);
    updateBot(dt);
    updateProjectiles(dt);
    updatePowers(dt);
    updateEffects(dt);
    updateFlagsBobbing(dt);
    checkCaptures();
    Game.time += dt;
    if (Game.running) {
      Game.roundTime += dt;
      if (Game.roundTime >= WORLD.ROUND_TIME) {
        resetRound();
        pushEvent("timeup", {});
      }
    }
  };

  /** Un paso autoritativo del host (con input remoto ya aplicado). */
  Game.stepHost = function (localInput, remoteInput, dt) {
    var localP = Game.players[Game.localTeam];
    var remoteP = Game.players[Game.localTeam === "red" ? "blue" : "red"];

    updateLocalHuman(localP, dt, localInput.keys || {}, localInput.aim);
    if (localInput.powers) {
      if (localInput.powers.q) useBoost(localP);
      if (localInput.powers.e) useShield(localP);
      if (localInput.powers.r) fire(localP);
      if (localInput.powers.f) useAbility(localP);
    }

    var rk = remoteInput.keys || {};
    var rax = 0;
    var ray = 0;
    if (rk.w) ray -= 1;
    if (rk.s) ray += 1;
    if (rk.a) rax -= 1;
    if (rk.d) rax += 1;
    movePlayer(remoteP, dt, rax, ray, false);
    remoteP.aim = remoteInput.aim === undefined ? remoteP.aim : remoteInput.aim;
    if (rax === 0 && ray === 0) {
      remoteP.facingX = Math.cos(remoteP.aim);
      remoteP.facingY = Math.sin(remoteP.aim);
    }
    if (remoteInput.powers) {
      if (remoteInput.powers.q) useBoost(remoteP);
      if (remoteInput.powers.e) useShield(remoteP);
      if (remoteInput.powers.r) fire(remoteP);
      if (remoteInput.powers.f) useAbility(remoteP);
    }

    tryPickup(localP);
    tryPickup(remoteP);
    updateProjectiles(dt);
    updatePowers(dt);
    updateEffects(dt);
    updateFlagsBobbing(dt);
    checkCaptures();
    Game.time += dt;
    Game.roundTime += dt;
    if (Game.roundTime >= WORLD.ROUND_TIME) {
      resetRound();
      pushEvent("timeup", {});
    }
  };

  /** Paso del invitado: mueve su personaje ya mismo, sin esperar al host. */
  Game.stepGuest = function (input, dt) {
    var p = Game.players[Game.localTeam];
    updateLocalHuman(p, dt, input.keys || {}, input.aim);
    if (input.powers) {
      if (input.powers.q) useBoost(p);
      if (input.powers.e) useShield(p);
      if (input.powers.r) fire(p);
      if (input.powers.f) useAbility(p);
    }
    tryPickup(p);
    updateProjectiles(dt);
    updatePowers(dt);
    updateEffects(dt);
    updateFlagsBobbing(dt);
    Game.time += dt;

    // reconciliacion suave con el estado autoritativo del host
    var dx = p.netX - p.x;
    var dy = p.netY - p.y;
    var d2 = dx * dx + dy * dy;
    if (d2 > 90000) {
      p.x = p.netX;
      p.y = p.netY;
      if (p.carrying) {
        var f = Game.flags[p.carrying];
        f.x = p.x;
        f.y = p.y;
      }
    } else if (d2 > 2500) {
      p.x += dx * 0.08;
      p.y += dy * 0.08;
    }
    if (p.carrying) {
      var fl = Game.flags[p.carrying];
      fl.x = p.x;
      fl.y = p.y;
    }
  };

  /* ------------------------------------------------------------------ *
   * Serializacion de red
   * ------------------------------------------------------------------ */

  function round2(v) {
    return Math.round(v * 100) / 100;
  }

  function packPowers(p) {
    return {
      b: round2(p.powers.boost.cd),
      bd: round2(p.powers.boost.duration),
      s: round2(p.powers.shield.cd),
      sd: round2(p.powers.shield.duration),
      t: round2(p.powers.shot.cd),
      a: round2(p.powers.ability.cd)
    };
  }

  function packPlayer(p) {
    return {
      x: Math.round(p.x),
      y: Math.round(p.y),
      fx: round2(p.facingX),
      fy: round2(p.facingY),
      aim: round2(p.aim),
      c: p.carrying,
      st: round2(p.stunned),
      rs: round2(p.respawn),
      k: p.kills,
      pw: packPowers(p)
    };
  }

  Game.packState = function () {
    return {
      p: {
        red: packPlayer(Game.players.red),
        blue: packPlayer(Game.players.blue)
      },
      f: {
        red: { x: Math.round(Game.flags.red.x), y: Math.round(Game.flags.red.y), c: Game.flags.red.carrier },
        blue: { x: Math.round(Game.flags.blue.x), y: Math.round(Game.flags.blue.y), c: Game.flags.blue.carrier }
      },
      sc: { red: Game.scores.red, blue: Game.scores.blue },
      k: { red: Game.kills.red, blue: Game.kills.blue },
      pr: Game.projectiles.slice(0, 10).map(function (pr) {
        return { x: Math.round(pr.x), y: Math.round(pr.y), t: pr.team };
      }),
      ev: Game.drainEvents(),
      roundTime: Math.round(Game.roundTime)
    };
  };

  function applyPowers(p, pw) {
    if (!pw) return;
    p.powers.boost.cd = pw.b;
    p.powers.boost.duration = pw.bd;
    p.powers.shield.cd = pw.s;
    p.powers.shield.duration = pw.sd;
    p.powers.shot.cd = pw.t;
    p.powers.ability.cd = pw.a;
  }

  /** El invitado aplica el estado del host (sin teletransportar su personaje). */
  Game.applyState = function (state, dt) {
    if (!state || !state.p) return;
    var localTeam = Game.localTeam;
    var remoteTeam = localTeam === "red" ? "blue" : "red";

    var sLocal = state.p[localTeam];
    var pLocal = Game.players[localTeam];
    pLocal.netX = sLocal.x;
    pLocal.netY = sLocal.y;
    pLocal.carrying = sLocal.c;
    pLocal.stunned = sLocal.st;
    pLocal.respawn = sLocal.rs;
    pLocal.kills = sLocal.k;
    applyPowers(pLocal, sLocal.pw);
    if (sLocal.rs > 0) {
      pLocal.x = -999;
      pLocal.y = -999;
    }

    var sRemote = state.p[remoteTeam];
    var pRemote = Game.players[remoteTeam];
    if (pRemote.respawn > 0 && sRemote.rs <= 0) {
      pRemote.x = sRemote.x;
      pRemote.y = sRemote.y;
      pRemote.netX = sRemote.x;
      pRemote.netY = sRemote.y;
    }
    var t = Math.min(1, dt * 13);
    if (sRemote.rs > 0) {
      pRemote.respawn = sRemote.rs;
      pRemote.x = -999;
      pRemote.y = -999;
    } else {
      pRemote.respawn = 0;
      pRemote.x = lerp(pRemote.x, sRemote.x, t);
      pRemote.y = lerp(pRemote.y, sRemote.y, t);
      pRemote.netX = sRemote.x;
      pRemote.netY = sRemote.y;
    }
    pRemote.carrying = sRemote.c;
    pRemote.stunned = sRemote.st;
    pRemote.kills = sRemote.k;
    pRemote.facingX = sRemote.fx;
    pRemote.facingY = sRemote.fy;
    pRemote.aim = sRemote.aim;
    applyPowers(pRemote, sRemote.pw);

    ["red", "blue"].forEach(function (team) {
      var sf = state.f[team];
      var f = Game.flags[team];
      f.carrier = sf.c;
      if (!sf.c) {
        f.x = lerp(f.x, sf.x, Math.min(1, dt * 16));
        f.y = lerp(f.y, sf.y, Math.min(1, dt * 16));
      }
    });

    Game.scores = state.sc;
    Game.kills = state.k;
    Game.roundTime = state.roundTime || Game.roundTime;
    if (state.ev && state.ev.length) {
      state.ev.forEach(function (ev) {
        Game.events.push(ev);
      });
      if (Game.events.length > 40) Game.events.splice(0, Game.events.length - 40);
    }

    // proyectiles: el invitado solo los dibuja
    Game.remoteProjectiles = (state.pr || []).map(function (pr) {
      return { x: pr.x, y: pr.y, team: pr.t, remote: true, vx: 0, vy: 0, r: WORLD.SHOT_R, life: 1, trail: [] };
    });
  };

  Game.setLocalPlayer = function (team, name, charId) {
    Game.localTeam = team;
    var p = Game.players[team];
    p.name = name;
    p.charId = charId;
    var ch = Models3D.getChar(charId);
    applyClass(p, ch.klass);
  };

  Game.setRemotePlayer = function (team, name, charId) {
    var p = Game.players[team];
    p.name = name;
    p.charId = charId;
    var ch = Models3D.getChar(charId);
    applyClass(p, ch.klass);
  };

  window.Game = Game;
})();
