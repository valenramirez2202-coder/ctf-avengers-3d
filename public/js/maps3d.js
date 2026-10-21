/**
 * Mapas del juego.
 *
 * El espacio de juego SIEMPRE es 900 x 560 (los mismos numeros que el juego
 * original en 2D). Al construir el 3D se reescala a metros con MAP_SCALE.
 *
 * `obstacles` describe la huella en planta: x, y, w, h (rect), o x, y, r
 * (circulo, cuando `round` es true). La altura y el color son opcionales y
 * sirven para dar variedad visual al 3D.
 */
(function () {
  "use strict";

  var MAPS = {
    classic: {
      name: "Clasico",
      desc: "Columnas, pasillos y dos torres laterales.",
      ground: 0x1b1b30,
      accent: 0x00ffcc,
      obstacles: [
        { x: 220, y: 80, w: 28, h: 140, h3: 26, color: 0x33335c },
        { x: 220, y: 340, w: 28, h: 140, h3: 26, color: 0x33335c },
        { x: 652, y: 80, w: 28, h: 140, h3: 26, color: 0x33335c },
        { x: 652, y: 340, w: 28, h: 140, h3: 26, color: 0x33335c },
        { x: 320, y: 200, w: 120, h: 28, h3: 22, color: 0x2b2b4d },
        { x: 460, y: 200, w: 120, h: 28, h3: 22, color: 0x2b2b4d },
        { x: 320, y: 340, w: 120, h: 28, h3: 22, color: 0x2b2b4d },
        { x: 460, y: 340, w: 120, h: 28, h3: 22, color: 0x2b2b4d },
        { x: 420, y: 100, w: 60, h: 40, h3: 44, color: 0x3a3a66 },
        { x: 420, y: 420, w: 60, h: 40, h3: 44, color: 0x3a3a66 },
        { x: 160, y: 250, w: 45, h: 45, h3: 36, color: 0x3a3a66 },
        { x: 695, y: 250, w: 45, h: 45, h3: 36, color: 0x3a3a66 }
      ]
    },

    labyrinth: {
      name: "Laberinto",
      desc: "Callejones estrechos: perfecto para emboscadas.",
      ground: 0x141a2c,
      accent: 0x66ffcc,
      obstacles: [
        { x: 200, y: 0, w: 20, h: 150, h3: 34 },
        { x: 200, y: 280, w: 20, h: 100, h3: 34 },
        { x: 200, y: 480, w: 20, h: 80, h3: 34 },
        { x: 380, y: 100, w: 20, h: 140, h3: 34 },
        { x: 380, y: 360, w: 20, h: 140, h3: 34 },
        { x: 560, y: 0, w: 20, h: 150, h3: 34 },
        { x: 560, y: 280, w: 20, h: 100, h3: 34 },
        { x: 560, y: 480, w: 20, h: 80, h3: 34 },
        { x: 720, y: 100, w: 20, h: 140, h3: 34 },
        { x: 720, y: 360, w: 20, h: 140, h3: 34 },
        { x: 220, y: 150, w: 140, h: 20, h3: 30, color: 0x2a3350 },
        { x: 400, y: 150, w: 140, h: 20, h3: 30, color: 0x2a3350 },
        { x: 220, y: 380, w: 140, h: 20, h3: 30, color: 0x2a3350 },
        { x: 400, y: 380, w: 140, h: 20, h3: 30, color: 0x2a3350 },
        { x: 580, y: 150, w: 120, h: 20, h3: 30, color: 0x2a3350 },
        { x: 580, y: 380, w: 120, h: 20, h3: 30, color: 0x2a3350 },
        { x: 100, y: 270, w: 100, h: 20, h3: 30, color: 0x2a3350 },
        { x: 720, y: 270, w: 100, h: 20, h3: 30, color: 0x2a3350 },
        { x: 420, y: 250, w: 55, h: 55, h3: 48, color: 0x3d4470 }
      ]
    },

    open: {
      name: "Campo Abierto",
      desc: "Pocas coberturas: manda la velocidad.",
      ground: 0x20202e,
      accent: 0xffd700,
      obstacles: [
        { x: 400, y: 160, w: 100, h: 36, h3: 20, color: 0x3a3a4f },
        { x: 260, y: 280, w: 60, h: 60, h3: 34, color: 0x3a3a4f },
        { x: 580, y: 280, w: 60, h: 60, h3: 34, color: 0x3a3a4f },
        { x: 160, y: 100, w: 48, h: 48, h3: 30, color: 0x3a3a4f },
        { x: 692, y: 100, w: 48, h: 48, h3: 30, color: 0x3a3a4f },
        { x: 160, y: 410, w: 48, h: 48, h3: 30, color: 0x3a3a4f },
        { x: 692, y: 410, w: 48, h: 48, h3: 30, color: 0x3a3a4f },
        { x: 430, y: 380, w: 40, h: 70, h3: 26, color: 0x3a3a4f }
      ]
    },

    fortress: {
      name: "Fortaleza",
      desc: "Bases amuralladas y un corazon fortificado.",
      ground: 0x1d1a24,
      accent: 0xff6699,
      obstacles: [
        { x: 120, y: 70, w: 90, h: 24, h3: 40, color: 0x4a3a4a },
        { x: 120, y: 70, w: 24, h: 140, h3: 40, color: 0x4a3a4a },
        { x: 120, y: 360, w: 90, h: 24, h3: 40, color: 0x4a3a4a },
        { x: 120, y: 360, w: 24, h: 140, h3: 40, color: 0x4a3a4a },
        { x: 690, y: 70, w: 90, h: 24, h3: 40, color: 0x3a4a5a },
        { x: 756, y: 70, w: 24, h: 140, h3: 40, color: 0x3a4a5a },
        { x: 690, y: 360, w: 90, h: 24, h3: 40, color: 0x3a4a5a },
        { x: 756, y: 360, w: 24, h: 140, h3: 40, color: 0x3a4a5a },
        { x: 340, y: 50, w: 220, h: 24, h3: 44, color: 0x3f3a5c },
        { x: 340, y: 490, w: 220, h: 24, h3: 44, color: 0x3f3a5c },
        { x: 390, y: 180, w: 120, h: 24, h3: 36, color: 0x3f3a5c },
        { x: 390, y: 360, w: 120, h: 24, h3: 36, color: 0x3f3a5c },
        { x: 430, y: 230, w: 40, h: 100, h3: 48, color: 0x4d477a },
        { x: 240, y: 250, w: 48, h: 48, h3: 32, color: 0x3f3a5c },
        { x: 612, y: 250, w: 48, h: 48, h3: 32, color: 0x3f3a5c }
      ]
    },

    cross: {
      name: "Cruce",
      desc: "Centro abierto y disputado, esquinas seguras.",
      ground: 0x1a2233,
      accent: 0x88aaff,
      obstacles: [
        { x: 410, y: 40, w: 80, h: 160, h3: 34, color: 0x2f3a56 },
        { x: 410, y: 360, w: 80, h: 160, h3: 34, color: 0x2f3a56 },
        { x: 160, y: 240, w: 180, h: 48, h3: 30, color: 0x2f3a56 },
        { x: 560, y: 240, w: 180, h: 48, h3: 30, color: 0x2f3a56 },
        { x: 240, y: 90, w: 48, h: 48, h3: 28, color: 0x39436a },
        { x: 612, y: 90, w: 48, h: 48, h3: 28, color: 0x39436a },
        { x: 240, y: 420, w: 48, h: 48, h3: 28, color: 0x39436a },
        { x: 612, y: 420, w: 48, h: 48, h3: 28, color: 0x39436a },
        { x: 340, y: 170, w: 40, h: 40, round: true, r: 20, h3: 42, color: 0x44507f },
        { x: 520, y: 170, w: 40, h: 40, round: true, r: 20, h3: 42, color: 0x44507f },
        { x: 340, y: 350, w: 40, h: 40, round: true, r: 20, h3: 42, color: 0x44507f },
        { x: 520, y: 350, w: 40, h: 40, round: true, r: 20, h3: 42, color: 0x44507f }
      ]
    }
  };

  /** Propiedades de juego (mismas que el original 2D). */
  var WORLD = {
    W: 900,
    H: 560,
    PLAYER_R: 22,
    FLAG_R: 12,
    BASE_W: 70,
    BASE_H: 120,
    WIN_SCORE: 3,
    ROUND_TIME: 240,
    MAP_SCALE: 0.1,
    START_SPEED: 195,
    SPEED_CARRY: 0.70,
    SPEED_BOOST: 1.65,
    SPEED_GUARD: 0.88,
    SPEED_SNIPER: 0.96,
    SPEED_AGILE: 1.12,
    SHOT_SPEED: 420,
    SHOT_R: 6,
    SHOT_LIFE: 1.1,
    SHOT_CD: 3.5,
    BOOST_CD: 8,
    BOOST_DUR: 2.4,
    SHIELD_CD: 10,
    SHIELD_DUR: 3,
    STUN_TIME: 0.8,
    RESPAWN_TIME: 2.2,
    // Segundos de invulnerabilidad al aparecer: evita que el bot campée el
    // spawn y mate al jugador nada mas revivir.
    SPAWN_PROTECT: 2.6,
    BASE_RADIUS: 92
  };

  function getMap(id) {
    return MAPS[id] || MAPS.classic;
  }

  function mapList() {
    return Object.keys(MAPS).map(function (id) {
      return { id: id, name: MAPS[id].name, desc: MAPS[id].desc };
    });
  }

  /** Devuelve una copia inmutable-ish de los obstaculos de un mapa. */
  function obstaclesOf(id) {
    var map = getMap(id);
    return map.obstacles.map(function (o) {
      return {
        x: o.x,
        y: o.y,
        w: o.w,
        h: o.h,
        r: o.round ? o.r : null,
        h3: o.h3 || 24,
        color: o.color || 0x2b2b4d
      };
    });
  }

  /** Colision circulo vs rectangulo (misma matematica del juego original). */
  function circleRect(cx, cy, r, rect) {
    var closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    var closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    var dx = cx - closestX;
    var dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  }

  /** Colision circulo vs circulo. */
  function circleCircle(cx, cy, r, ox, oy, or_) {
    var dx = cx - ox;
    var dy = cy - oy;
    var rr = r + or_;
    return dx * dx + dy * dy < rr * rr;
  }

  /** Comprueba si un circulo choca contra cualquier obstaculo del mapa. */
  function hitsObstacle(x, y, r, obstacles) {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.r != null) {
        if (circleCircle(x, y, r, o.x + o.w / 2, o.y + o.h / 2, o.r)) return true;
      } else if (circleRect(x, y, r, o)) {
        return true;
      }
    }
    return false;
  }

  /** Comprueba si un punto (circulo) esta fuera del mundo. */
  function outOfBounds(x, y, r) {
    return x < r || y < r || x > WORLD.W - r || y > WORLD.H - r;
  }

  /**
   * Resuelve el movimiento de un circulo con deslizamiento.
   * Devuelve { x, y, blocked }.
   */
  function slideMove(px, py, nx, ny, r, obstacles) {
    var ox = nx;
    var oy = ny;
    if (outOfBounds(ox, oy, r) || hitsObstacle(ox, oy, r, obstacles)) {
      if (!outOfBounds(nx, py, r) && !hitsObstacle(nx, py, r, obstacles)) {
        ox = nx;
        oy = py;
      } else if (!outOfBounds(px, ny, r) && !hitsObstacle(px, ny, r, obstacles)) {
        ox = px;
        oy = ny;
      } else {
        ox = px;
        oy = py;
      }
    }
    return { x: ox, y: oy, blocked: ox === px && oy === py };
  }

  /**
   * Segmento con muestreo: se usa para el disparo hitscan y para la IA,
   * para saber si hay un obstaculo en medio. Devuelve true si esta libre.
   */
  function segmentClear(x1, y1, x2, y2, obstacles, step) {
    step = step || 14;
    var dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    var steps = Math.max(1, Math.ceil(dist / step));
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var x = x1 + (x2 - x1) * t;
      var y = y1 + (y2 - y1) * t;
      if (hitsObstacle(x, y, 4, obstacles)) return false;
    }
    return true;
  }

  /**
   * Igual que segmentClear pero teniendo en cuenta el radio del cuerpo: si no,
   * la IA "ve" lineas libres por esquinas estrechas y se atasca contra ellas.
   */
  function segmentClearR(x1, y1, x2, y2, r, obstacles, step) {
    step = step || Math.max(6, r * 0.6);
    var dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    var steps = Math.max(1, Math.ceil(dist / step));
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var x = x1 + (x2 - x1) * t;
      var y = y1 + (y2 - y1) * t;
      if (hitsObstacle(x, y, r, obstacles) || outOfBounds(x, y, r)) return false;
    }
    return true;
  }

  /**
   * Buscador de camino en rejilla (BFS). Devuelve una lista de puntos
   * [ {x,y}, ... ] desde el origen hasta el destino, o null si no hay ruta.
   * La rejilla se infla con el radio del cuerpo para no rozar las paredes.
   */
  function findPath(sx, sy, tx, ty, r, obstacles, cell) {
    cell = cell || 24;
    var cols = Math.ceil(WORLD.W / cell);
    var rows = Math.ceil(WORLD.H / cell);
    var startI = Math.max(0, Math.min(cols - 1, Math.floor(sx / cell)));
    var startJ = Math.max(0, Math.min(rows - 1, Math.floor(sy / cell)));
    var goalI = Math.max(0, Math.min(cols - 1, Math.floor(tx / cell)));
    var goalJ = Math.max(0, Math.min(rows - 1, Math.floor(ty / cell)));

    function walkable(i, j) {
      var cx = i * cell + cell / 2;
      var cy = j * cell + cell / 2;
      return !hitsObstacle(cx, cy, r, obstacles) && !outOfBounds(cx, cy, r);
    }

    var total = cols * rows;
    var prev = new Int32Array(total).fill(-1);
    var seen = new Uint8Array(total);
    var startIdx = startJ * cols + startI;
    var goalIdx = goalJ * cols + goalI;
    if (startIdx === goalIdx) return [{ x: tx, y: ty }];

    var queue = [startIdx];
    seen[startIdx] = 1;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    var found = false;
    var head = 0;
    while (head < queue.length && !found) {
      var cur = queue[head++];
      var ci = cur % cols;
      var cj = (cur - ci) / cols;
      for (var d = 0; d < dirs.length; d++) {
        var ni = ci + dirs[d][0];
        var nj = cj + dirs[d][1];
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
        var nIdx = nj * cols + ni;
        if (seen[nIdx]) continue;
        if (nIdx !== goalIdx && !walkable(ni, nj)) continue;
        if (nIdx === goalIdx && !walkable(ni, nj)) {
          // El centro del destino puede estar junto a una pared: se permite
          // como ultimo paso si el propio destino es alcanzable.
          if (hitsObstacle(tx, ty, r, obstacles) || outOfBounds(tx, ty, r)) continue;
        }
        seen[nIdx] = 1;
        prev[nIdx] = cur;
        if (nIdx === goalIdx) { found = true; break; }
        queue.push(nIdx);
      }
    }
    if (!found) return null;

    var path = [];
    var node = goalIdx;
    while (node !== -1) {
      var ii = node % cols;
      var jj = (node - ii) / cols;
      path.push({ x: ii * cell + cell / 2, y: jj * cell + cell / 2 });
      node = prev[node];
      if (path.length > total) break;
    }
    path.reverse();
    // Sustituye el ultimo punto de rejilla por el destino exacto.
    if (path.length) path[path.length - 1] = { x: tx, y: ty };
    return path;
  }

  window.MAPS = MAPS;
  window.WORLD = WORLD;
  window.MapUtils = {
    getMap: getMap,
    mapList: mapList,
    obstaclesOf: obstaclesOf,
    circleRect: circleRect,
    circleCircle: circleCircle,
    hitsObstacle: hitsObstacle,
    outOfBounds: outOfBounds,
    slideMove: slideMove,
    segmentClear: segmentClear,
    segmentClearR: segmentClearR,
    findPath: findPath
  };
})();
