/**
 * Modelos 3D generados por codigo (no hacen falta archivos .glb).
 *
 * Estilo: figuras redondeadas (capsulas, esferas, toros) en vez de cajas
 * duras. Cada heroe tiene:
 *   - paleta de colores propia (traje, acento, piel)
 *   - una "clase" que define stats y habilidad
 *   - una silueta distinta (capas de tela, capa suelta, gorra, casco...)
 *   - detalles iconicos (escudo del Capitain, Mjolnir, repulsores, etc.)
 *
 * Los modelos se construyen una sola vez y se reutilizan clonando el grupo.
 *
 * Esqueleto (para animar en game3d.js):
 *   parts.legL/legR      -> pivote de cadera (rotation.x)
 *   parts.kneeL/kneeR    -> pivote de rodilla (rotation.x)
 *   parts.armL/armR      -> pivote de hombro (rotation.x)
 *   parts.elbowL/elbowR  -> pivote de codo (rotation.x)
 *   parts.torso          -> torso (position.y / rotation.y)
 *   parts.head           -> cabeza (rotation.y)
 *   parts.cape           -> capa (rotation.x)
 *   parts.core           -> nucleo luminoso (scale)
 *   parts.weapon         -> arma en la mano derecha
 *   parts.hips           -> cadera (position.y)
 */
(function () {
  "use strict";

  var SPRITE_SIZE = 80;
  var SPRITE_COLS = 6;

  /**
   * Clases de heroe: cambian stats y habilidad definitiva.
   */
  var CLASSES = {
    guardian: {
      id: "guardian",
      name: "Guardian",
      desc: "Mas aguante y escudo largo.",
      speed: 0.88,
      ability: "shieldburst",
      abilityName: "Burbuja de energia",
      abilityCd: 16,
      shieldDur: 4.5
    },
    sniper: {
      id: "sniper",
      name: "Francotirador",
      desc: "Disparo rapido y potente a distancia.",
      speed: 0.96,
      ability: "longshot",
      abilityName: "Rayo certero",
      abilityCd: 12,
      shotR: 8,
      shotSpeed: 900,
      shotCd: 2.2
    },
    agile: {
      id: "agile",
      name: "Agil",
      desc: "Rapido, salta y derriba al rival.",
      speed: 1.12,
      ability: "dash",
      abilityName: "Embestida",
      abilityCd: 9
    }
  };

  /** Los 22 personajes del sprite original + 5 skins exclusivos del 3D. */
  var CHARACTERS = [
    { id: "ironman", name: "Iron Man", idx: 0, suit: 0xb01515, accent: 0xffd700, skin: 0xf0c090, klass: "sniper", head: "helmet" },
    { id: "spiderman", name: "Spider-Man", idx: 1, suit: 0xc21111, accent: 0x1122aa, skin: 0xf0c090, klass: "agile", head: "mask" },
    { id: "panther", name: "Black Panther", idx: 2, suit: 0x14141c, accent: 0x9f7bff, skin: 0xf0c090, klass: "agile", head: "helmet" },
    { id: "warmachine", name: "War Machine", idx: 3, suit: 0x4a4a4a, accent: 0xbbbbbb, skin: 0xf0c090, klass: "guardian", head: "helmet" },
    { id: "vision", name: "Vision", idx: 4, suit: 0x2f5d3a, accent: 0xffcc44, skin: 0xd94f4f, klass: "sniper", head: "mask" },
    { id: "widow", name: "Black Widow", idx: 5, suit: 0x1c1c1c, accent: 0xd8344a, skin: 0xf0c090, klass: "agile", head: "hair" },
    { id: "heimdall", name: "Heimdall", idx: 6, suit: 0xb98a2e, accent: 0xffffff, skin: 0x9a6b3f, klass: "guardian", head: "helmet" },
    { id: "loki", name: "Loki", idx: 7, suit: 0x1f6f3f, accent: 0xffd700, skin: 0xf0c090, klass: "sniper", head: "horned" },
    { id: "thor", name: "Thor", idx: 8, suit: 0x3a56c4, accent: 0xffd700, skin: 0xf0c090, klass: "guardian", head: "helmet" },
    { id: "hulk", name: "Hulk", idx: 9, suit: 0x3f8f3f, accent: 0x6b2f8f, skin: 0x4caf50, klass: "guardian", head: "bare", big: 1.22 },
    { id: "strange", name: "Dr. Strange", idx: 10, suit: 0x2a2a7a, accent: 0xffd700, skin: 0xf0c090, klass: "sniper", head: "hair", cape: 0xd02030 },
    { id: "cap", name: "Cap. America", idx: 11, suit: 0x1a4fa0, accent: 0xffffff, skin: 0xf0c090, klass: "guardian", head: "helmet" },
    { id: "falcon", name: "Falcon", idx: 12, suit: 0x8a1414, accent: 0xaaaaaa, skin: 0x7a4a25, klass: "agile", head: "goggles", cape: 0xd03030 },
    { id: "antman", name: "Ant-Man", idx: 13, suit: 0x9a6600, accent: 0xdd3333, skin: 0xf0c090, klass: "agile", head: "helmet" },
    { id: "bucky", name: "Winter Soldier", idx: 14, suit: 0x2a2a34, accent: 0xb0b0c0, skin: 0xf0c090, klass: "sniper", head: "hair", big: 1.06 },
    { id: "wanda", name: "Scarlet Witch", idx: 15, suit: 0x8a1a3a, accent: 0xff4466, skin: 0xf0c090, klass: "sniper", head: "crown", cape: 0xb01030 },
    { id: "hawkeye", name: "Hawkeye", idx: 16, suit: 0x6a2f8f, accent: 0xdddddd, skin: 0xf0c090, klass: "sniper", head: "goggles" },
    { id: "groot", name: "Groot", idx: 17, suit: 0x6b4a2a, accent: 0x3f7f3f, skin: 0x6b4a2a, klass: "guardian", head: "bare", big: 1.28 },
    { id: "rocket", name: "Rocket", idx: 18, suit: 0x8a6a3a, accent: 0xdddddd, skin: 0xa08050, klass: "sniper", head: "bare", big: 0.82 },
    { id: "starlord", name: "Star-Lord", idx: 19, suit: 0x4a2f6a, accent: 0xdd4444, skin: 0xf0c090, klass: "sniper", head: "helmet" },
    { id: "gamora", name: "Gamora", idx: 20, suit: 0x1f6f4f, accent: 0x6effc0, skin: 0x2faf6f, klass: "agile", head: "hair" },
    { id: "drax", name: "Drax", idx: 21, suit: 0x5a4a3a, accent: 0x9a8a6a, skin: 0x6a5a4a, klass: "guardian", head: "bare", big: 1.14 },

    /* --- Skins exclusivos del 3D (dibujados por codigo, sin sprite) --- */
    { id: "mk2", name: "Iron Man MK-II", skin3d: true, suit: 0xd4c11a, accent: 0xfff2a0, skin: 0xf0c090, klass: "sniper", head: "helmet" },
    { id: "venom", name: "Venom", skin3d: true, suit: 0x1a1a24, accent: 0xffffff, skin: 0x101018, klass: "agile", head: "mask", big: 1.15 },
    { id: "ultron", name: "Ultron", skin3d: true, suit: 0x8a8a92, accent: 0xff2222, skin: 0xb0b0b8, klass: "guardian", head: "helmet" },
    { id: "surfer", name: "Silver Surfer", skin3d: true, suit: 0xc0c8d8, accent: 0x8fd8ff, skin: 0xc0c8d8, klass: "agile", head: "bare", board: true },
    { id: "nova", name: "Nova", skin3d: true, suit: 0x1650b0, accent: 0xffd700, skin: 0xf0c090, klass: "sniper", head: "helmet", cape: 0x2288ff }
  ];

  var byId = {};
  CHARACTERS.forEach(function (c) {
    byId[c.id] = c;
  });

  function getChar(id) {
    return byId[id] || CHARACTERS[0];
  }

  function getClass(id) {
    return CLASSES[id] || CLASSES.sniper;
  }

  /* ------------------------------------------------------------------ *
   * Construccion de modelos (formas redondeadas)
   * ------------------------------------------------------------------ */

  function mat(color, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: opts.metalness === undefined ? (opts.suit ? 0.55 : 0.1) : opts.metalness,
      roughness: opts.roughness === undefined ? (opts.suit ? 0.32 : 0.75) : opts.roughness,
      emissive: opts.emissive === undefined ? 0x000000 : opts.emissive,
      emissiveIntensity: opts.emissiveIntensity === undefined ? 1 : opts.emissiveIntensity,
      transparent: !!opts.transparent,
      opacity: opts.opacity === undefined ? 1 : opts.opacity
    });
  }

  /** Capsula suave (miembros). Mas segmentos = silueta redonda, sin facetas. */
  function capsule(r, len, color, opts) {
    return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat(color, opts));
  }

  function sphere(r, color, opts, seg) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 26, seg || 20), mat(color, opts));
  }

  /** Toro (anillos, cinturones, patrones). */
  function torus(r, tube, color, opts, arc) {
    return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 32, arc || Math.PI * 2), mat(color, opts));
  }

  /**
   * Cuerpo suave y bien formado (estilo Roblox pulido): superficie de
   * revolucion con perfil que ensancha el pecho y estrecha la cintura.
   * Se aplana ligeramente en Z para que sea mas ancho que profundo.
   * profile = [ [radio, y], ... ] de abajo arriba.
   */
  function smoothBody(profile, color, opts, flattenZ) {
    var pts = profile.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var geo = new THREE.LatheGeometry(pts, 30);
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, mat(color, opts));
    if (flattenZ) mesh.scale.z = flattenZ;
    return mesh;
  }

  /** Detalle luminoso (ojos, visor, nucleo). */
  function glow(w, h, d, color) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, { emissive: color, emissiveIntensity: 1.8, metalness: 0.2, roughness: 0.4 }));
  }

  /** Esfera achatada (ojos grandes tipo mascara). */
  function eye(rx, ry, rz, color) {
    var m = sphere(1, color, { emissive: color, emissiveIntensity: 0.6 }, 16);
    m.scale.set(rx, ry, rz);
    return m;
  }

  /**
   * Ojo cartoon chibi: esfera blanca grande con pupila oscura y brillo.
   * Es lo que da el aire "limpio pero cabezon".
   */
  function cartoonEye(headShape, s, side, opts) {
    opts = opts || {};
    var x = side * 0.12 * s;
    var y = 0.02 * s;
    var z = 0.275 * s;
    var whiteR = 0.085 * s;

    // esfera blanca del ojo
    var white = sphere(whiteR, opts.white || 0xffffff, { roughness: 0.25, metalness: 0 }, 20);
    white.scale.set(0.9, 1.15, 0.6);
    white.position.set(x, y, z);
    headShape.add(white);

    // pupila
    var pupil = sphere(whiteR * 0.55, opts.pupil || 0x1a1420, { roughness: 0.3 }, 14);
    pupil.scale.set(0.9, 1.15, 0.5);
    pupil.position.set(x + side * 0.004 * s, y, z + 0.05 * s);
    headShape.add(pupil);

    // brillo (punto de luz del ojo)
    var shine = sphere(whiteR * 0.22, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 }, 8);
    shine.position.set(x + side * 0.03 * s, y + 0.03 * s, z + 0.07 * s);
    headShape.add(shine);
  }

  /**
   * Crea la geometria base de un heroe mirando hacia +Z.
   * Devuelve { group, parts } donde parts permite animar.
   */
  function buildHero(char) {
    var klass = getClass(char.klass);
    var s = char.big || 1;
    var suit = char.suit;
    var accent = char.accent;
    var skin = char.skin;

    var group = new THREE.Group();
    var parts = {};

    // ---- cadera (grupos las piernas). Chibi: piernas cortas ----
    var hips = new THREE.Group();
    hips.position.y = 0.5 * s;
    group.add(hips);
    parts.hips = hips;

    // ---- piernas (cadera -> rodilla -> pie), cortas y regordetas ----
    function leg(side) {
      var hip = new THREE.Group();
      hip.position.set(side * 0.11 * s, 0, 0);
      hips.add(hip);

      var thigh = capsule(0.11 * s, 0.1 * s, suit, { suit: true });
      thigh.position.y = -0.14 * s;
      hip.add(thigh);

      var knee = new THREE.Group();
      knee.position.y = -0.3 * s;
      hip.add(knee);

      var shin = capsule(0.095 * s, 0.08 * s, suit, { suit: true });
      shin.position.y = -0.1 * s;
      knee.add(shin);

      // bota redondeada (grandes, estilo chibi)
      var boot = sphere(0.135 * s, accent, { suit: true });
      boot.scale.set(0.95, 0.72, 1.3);
      boot.position.set(0, -0.2 * s, 0.04 * s);
      knee.add(boot);

      // rodillera
      var pad = sphere(0.08 * s, accent, { suit: true });
      pad.scale.set(1, 0.8, 0.9);
      pad.position.z = 0.07 * s;
      knee.add(pad);

      return { hip: hip, knee: knee };
    }
    var legLo = leg(-1);
    var legHi = leg(1);
    parts.legL = legLo.hip;
    parts.legR = legHi.hip;
    parts.kneeL = legLo.knee;
    parts.kneeR = legHi.knee;

    // ---- torso (cuerpo suave bien formado, estilo Roblox pulido) ----
    var torso = new THREE.Group();
    torso.position.y = 0.66 * s;
    group.add(torso);
    parts.torso = torso;

    // perfil de abajo (cintura) arriba (hombros): ensancha el pecho
    var body = smoothBody([
      [0.15 * s, 0.0],
      [0.19 * s, 0.1 * s],
      [0.225 * s, 0.24 * s],
      [0.215 * s, 0.34 * s],
      [0.16 * s, 0.42 * s],
      [0.07 * s, 0.46 * s]
    ], suit, { suit: true }, 0.86);
    torso.add(body);

    // cinturon
    var belt = torus(0.185 * s, 0.042 * s, accent, { suit: true });
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.05 * s;
    torso.add(belt);

    // pechera/acento
    var chestPlate = sphere(0.12 * s, accent, { suit: true });
    chestPlate.scale.set(1.4, 1.1, 0.6);
    chestPlate.position.set(0, 0.24 * s, 0.15 * s);
    torso.add(chestPlate);

    // nucleo luminoso (Iron Man, War Machine, Ultron, Vision)
    if (char.id === "ironman" || char.id === "mk2" || char.id === "ultron" || char.id === "warmachine" || char.id === "vision") {
      var core = sphere(0.055 * s, accent, { emissive: accent, emissiveIntensity: 2.4 }, 16);
      core.position.set(0, 0.24 * s, 0.16 * s);
      torso.add(core);
      parts.core = core;
    }

    // ---- hombros (brazos cortos y suaves, bien pegados al cuerpo) ----
    function arm(side) {
      var shoulder = new THREE.Group();
      shoulder.position.set(side * 0.22 * s, 0.36 * s, 0);
      torso.add(shoulder);

      // hombrera redonda
      var pad = sphere(0.11 * s, accent, { suit: true });
      pad.scale.set(1.1, 0.9, 1.05);
      shoulder.add(pad);

      var upper = capsule(0.078 * s, 0.1 * s, suit, { suit: true });
      upper.position.y = -0.12 * s;
      shoulder.add(upper);

      var elbow = new THREE.Group();
      elbow.position.y = -0.24 * s;
      shoulder.add(elbow);

      var fore = capsule(0.07 * s, 0.08 * s, suit, { suit: true });
      fore.position.y = -0.09 * s;
      elbow.add(fore);

      // mano grande y redonda (chibi)
      var hand = sphere(0.092 * s, skin, { roughness: 0.7 });
      hand.scale.set(0.95, 1, 0.9);
      hand.position.y = -0.2 * s;
      elbow.add(hand);

      return { shoulder: shoulder, elbow: elbow, hand: hand };
    }
    var armLo = arm(-1);
    var armHi = arm(1);
    parts.armL = armLo.shoulder;
    parts.armR = armHi.shoulder;
    parts.elbowL = armLo.elbow;
    parts.elbowR = armHi.elbow;
    parts.handR = armHi.hand;

    // ---- cuello corto y cabeza grande (chibi cabezon) ----
    var neck = capsule(0.062 * s, 0.04 * s, suit, { suit: true });
    neck.position.y = 1.14 * s;
    group.add(neck);

    var headShape = new THREE.Group();
    headShape.position.y = 1.32 * s;
    group.add(headShape);
    parts.head = headShape;

    // craneo grande y redondo
    var skull = sphere(0.3 * s, skin, { roughness: 0.85 });
    skull.scale.set(1, 1.02, 0.98);
    headShape.add(skull);

    // ---- rasgos segun el tipo de cabeza ----
    buildHead(headShape, char, s, suit, accent, skin);

    // ---- capa ----
    if (char.cape) {
      parts.cape = buildCape(group, char.cape, s);
    }

    // ---- tabla voladora (Silver Surfer) ----
    if (char.board) {
      var board = capsule(0.26 * s, 0.9 * s, 0xc8d0e0, { suit: true, metalness: 0.9, roughness: 0.15 });
      board.rotation.x = Math.PI / 2;
      board.position.y = 0.05;
      group.add(board);
      parts.board = board;
      group.userData.hover = true;
    }

    // ---- arma / accesorio segun personaje y clase ----
    parts.weapon = buildWeapon(char, klass, s, accent, armHi);

    // ---- extras iconicos por personaje ----
    addCharacterExtras(char, s, group, torso, armLo, armHi, parts, suit, accent);

    group.userData.height = 1.62 * s;
    return { group: group, parts: parts, klass: klass, scale: s };
  }

  /* ------------------------------------------------------------------ *
   * Cabezas: cascos, mascaras y rasgos faciales
   * ------------------------------------------------------------------ */

  function buildHead(headShape, char, s, suit, accent, skin) {
    // El craneo mide 0.3*s (chibi cabezon). Los rasgos se reescalaron a esta
    // medida y se usan ojos cartoon grandes para el look limpio.
    switch (char.head) {
      case "helmet": {
        var helmet = sphere(0.31 * s, suit, { suit: true });
        helmet.scale.set(1, 1.03, 1);
        headShape.add(helmet);

        // placa facial dorada sobresaliendo del casco (estilo Iron Man)
        var face = sphere(0.21 * s, accent, { suit: true });
        face.scale.set(0.78, 0.9, 0.5);
        face.position.set(0, -0.01 * s, 0.21 * s);
        headShape.add(face);

        // ojos luminosos del casco (grandes, cartoon, encima de la placa)
        [-1, 1].forEach(function (side) {
          var vis = eye(0.075 * s, 0.042 * s, 0.03 * s, 0xeaf6ff);
          vis.position.set(side * 0.085 * s, 0.03 * s, 0.3 * s);
          vis.rotation.z = side * 0.16;
          headShape.add(vis);
        });

        // cresta central
        var crest = capsule(0.026 * s, 0.12 * s, accent, { suit: true });
        crest.rotation.x = Math.PI / 2;
        crest.position.set(0, 0.16 * s, 0.1 * s);
        headShape.add(crest);
        break;
      }
      case "horned": {
        var helm2 = sphere(0.31 * s, suit, { suit: true });
        helm2.scale.set(1, 1.02, 1);
        headShape.add(helm2);

        [-1, 1].forEach(function (side) {
          // cuernos curvados de Loki
          var horn = new THREE.Mesh(
            new THREE.TorusGeometry(0.17 * s, 0.026 * s, 8, 18, Math.PI * 0.7),
            mat(accent, { suit: true, metalness: 0.8, roughness: 0.3 })
          );
          horn.position.set(side * 0.18 * s, 0.12 * s, 0);
          horn.rotation.set(0, side * 0.5, side > 0 ? -0.9 : Math.PI + 0.9);
          headShape.add(horn);
        });

        // ojos cartoon (Loki)
        cartoonEye(headShape, s, -1, { pupil: 0x1a3a20 });
        cartoonEye(headShape, s, 1, { pupil: 0x1a3a20 });
        break;
      }
      case "mask": {
        var mask = sphere(0.31 * s, suit, { suit: true });
        mask.scale.set(1.02, 1.03, 1);
        headShape.add(mask);

        // ojos grandes de mascara (Spider-Man / Venom), estilo cartoon
        [-1, 1].forEach(function (side) {
          var e = eye(0.12 * s, 0.095 * s, 0.05 * s, accent);
          e.position.set(side * 0.115 * s, 0.03 * s, 0.28 * s);
          e.rotation.set(0, -side * 0.32, side * 0.32);
          headShape.add(e);
        });

        // patrones de tela / venas
        if (char.id === "spiderman") {
          for (var i = -2; i <= 2; i++) {
            var line = torus(0.15 * s * (1 - Math.abs(i) * 0.12), 0.014 * s, accent, { roughness: 0.5 });
            line.rotation.set(Math.PI / 2 + i * 0.22, 0, 0);
            line.position.z = 0.13 * s;
            headShape.add(line);
          }
        }
        if (char.id === "venom") {
          // dientes
          var mouth = torus(0.12 * s, 0.024 * s, 0xffffff, { emissive: 0x552222, emissiveIntensity: 0.4 }, Math.PI);
          mouth.rotation.set(0, 0, Math.PI);
          mouth.position.set(0, -0.1 * s, 0.24 * s);
          headShape.add(mouth);
        }
        break;
      }
      case "hair": {
        var hair = sphere(0.31 * s, char.accent, { roughness: 0.9 });
        hair.scale.set(1.02, 0.96, 1.02);
        hair.position.y = 0.03 * s;
        headShape.add(hair);

        var back = capsule(0.14 * s, 0.15 * s, char.accent, { roughness: 0.95 });
        back.position.set(0, -0.03 * s, -0.14 * s);
        headShape.add(back);

        // flequillo
        var fringe = sphere(0.2 * s, char.accent, { roughness: 0.9 });
        fringe.scale.set(1.15, 0.55, 0.75);
        fringe.position.set(0, 0.19 * s, 0.14 * s);
        headShape.add(fringe);

        // ojos cartoon
        cartoonEye(headShape, s, -1);
        cartoonEye(headShape, s, 1);
        break;
      }
      case "goggles": {
        // gafas/goggles
        [-1, 1].forEach(function (side) {
          var lens = torus(0.08 * s, 0.022 * s, accent, { suit: true, emissive: accent, emissiveIntensity: 0.5 });
          lens.position.set(side * 0.115 * s, 0.03 * s, 0.275 * s);
          headShape.add(lens);
        });
        var bridge = capsule(0.016 * s, 0.07 * s, accent, { suit: true });
        bridge.rotation.z = Math.PI / 2;
        bridge.position.set(0, 0.03 * s, 0.275 * s);
        headShape.add(bridge);

        // pelo corto
        var cap2 = sphere(0.3 * s, 0x2a2018, { roughness: 0.9 });
        cap2.scale.set(1.01, 0.9, 1.01);
        cap2.position.y = 0.06 * s;
        headShape.add(cap2);
        break;
      }
      case "crown": {
        // corona/tiara de la Bruja Escarlata
        var crown = torus(0.2 * s, 0.035 * s, accent, { suit: true, emissive: accent, emissiveIntensity: 0.6 });
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 0.16 * s;
        headShape.add(crown);

        var gem = sphere(0.05 * s, accent, { emissive: accent, emissiveIntensity: 2 });
        gem.position.set(0, 0.16 * s, 0.27 * s);
        headShape.add(gem);

        // pelo largo
        var hair2 = sphere(0.31 * s, 0x2a1a12, { roughness: 0.9 });
        hair2.scale.set(1.01, 0.93, 1.01);
        hair2.position.y = 0.02 * s;
        headShape.add(hair2);

        // ojos cartoon
        cartoonEye(headShape, s, -1, { pupil: 0x3a1020 });
        cartoonEye(headShape, s, 1, { pupil: 0x3a1020 });
        break;
      }
      default: {
        // cara al descubierto: ojos cartoon grandes, cejas y pelo
        cartoonEye(headShape, s, -1);
        cartoonEye(headShape, s, 1);

        [-1, 1].forEach(function (side) {
          var brow = capsule(0.018 * s, 0.07 * s, 0x2a2018, { roughness: 0.9 });
          brow.rotation.z = Math.PI / 2 + side * 0.12;
          brow.position.set(side * 0.12 * s, 0.12 * s, 0.275 * s);
          headShape.add(brow);
        });

        // nariz diminuta
        var nose = sphere(0.032 * s, skin, { roughness: 0.8 });
        nose.scale.set(0.8, 0.7, 1);
        nose.position.set(0, -0.02 * s, 0.29 * s);
        headShape.add(nose);

        // pelo / cresta superior
        var top = sphere(0.28 * s, 0x241c16, { roughness: 0.92 });
        top.scale.set(1.02, 0.82, 1.02);
        top.position.y = 0.1 * s;
        headShape.add(top);

        // barba opcional (Strange, Drax, Thor)
        if (char.id === "strange" || char.id === "drax" || char.id === "thor") {
          var beard = sphere(0.16 * s, 0x1a1410, { roughness: 0.95 });
          beard.scale.set(1.2, 0.75, 0.9);
          beard.position.set(0, -0.15 * s, 0.14 * s);
          headShape.add(beard);
        }
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Capa curvada (plano con segmentos curvados)
   * ------------------------------------------------------------------ */

  function buildCape(group, color, s) {
    var geo = new THREE.PlaneGeometry(0.42 * s, 0.8 * s, 6, 8);
    // Curvar la capa: el borde inferior se aleja hacia atras
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      var t = (0.4 * s - y) / (0.8 * s); // 0 arriba, 1 abajo
      pos.setZ(i, -t * t * 0.32 * s);
      // ensanchar abajo
      pos.setX(i, pos.getX(i) * (1 + t * 0.35));
    }
    geo.computeVertexNormals();

    var cape = new THREE.Mesh(geo, mat(color, { suit: true, roughness: 0.7 }));
    cape.material.side = THREE.DoubleSide;
    cape.position.set(0, 0.78 * s, -0.18 * s);
    group.add(cape);
    return cape;
  }

  /* ------------------------------------------------------------------ *
   * Armas por personaje (en la mano derecha)
   * ------------------------------------------------------------------ */

  function buildWeapon(char, klass, s, accent, armHi) {
    var weapon = new THREE.Group();

    switch (char.id) {
      case "cap": {
        // Escudo redondo con estrella
        var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 0.04 * s, 26), mat(0xd02030, { suit: true, metalness: 0.7, roughness: 0.3 }));
        disc.rotation.x = Math.PI / 2;
        weapon.add(disc);
        var ring2 = torus(0.16 * s, 0.022 * s, 0xffffff, { suit: true, metalness: 0.6 });
        ring2.position.z = 0.022 * s;
        weapon.add(ring2);
        var ring3 = torus(0.1 * s, 0.02 * s, 0xd02030, { suit: true, metalness: 0.6 });
        ring3.position.z = 0.024 * s;
        weapon.add(ring3);
        // estrella central
        var star = sphere(0.05 * s, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.3, metalness: 0.6 });
        star.scale.set(1, 1, 0.4);
        star.position.z = 0.03 * s;
        weapon.add(star);
        weapon.position.set(-0.02 * s, -0.28 * s, 0.14 * s);
        weapon.rotation.set(0, 0.3, 0);
        break;
      }
      case "thor": {
        // Mjolnir
        var head = box2(0.14 * s, 0.1 * s, 0.16 * s, 0x9aa2b0, { metalness: 0.85, roughness: 0.25 });
        weapon.add(head);
        var trim = box2(0.15 * s, 0.02 * s, 0.17 * s, accent, { suit: true, metalness: 0.8 });
        trim.position.y = -0.04 * s;
        weapon.add(trim);
        var handle = capsule(0.022 * s, 0.14 * s, 0x5a4632, { roughness: 0.85 });
        handle.position.y = -0.13 * s;
        weapon.add(handle);
        weapon.position.set(0.02 * s, -0.3 * s, 0.06 * s);
        weapon.rotation.set(0.4, 0, -0.2);
        partsTag(weapon, "hammer");
        break;
      }
      case "hawkeye": {
        // Arco
        var bow = new THREE.Mesh(new THREE.TorusGeometry(0.24 * s, 0.02 * s, 8, 20, Math.PI * 1.1), mat(accent, { suit: true }));
        bow.rotation.set(0, Math.PI / 2, Math.PI * 0.45);
        weapon.add(bow);
        var string = capsule(0.006 * s, 0.44 * s, 0xffffff, { roughness: 0.9 });
        string.position.x = 0.02 * s;
        weapon.add(string);
        weapon.position.set(-0.06 * s, -0.2 * s, 0.05 * s);
        break;
      }
      case "widow": {
        // Bastones eléctricos
        var baton = capsule(0.018 * s, 0.2 * s, 0x222228, { metalness: 0.6, roughness: 0.4 });
        weapon.add(baton);
        var tip = sphere(0.03 * s, accent, { emissive: accent, emissiveIntensity: 2 });
        tip.position.y = 0.12 * s;
        weapon.add(tip);
        weapon.position.set(0, -0.28 * s, 0.03 * s);
        break;
      }
      case "drax": {
        // Cuchillos
        var blade2 = box2(0.03 * s, 0.16 * s, 0.06 * s, 0xcfd4dc, { metalness: 0.9, roughness: 0.2 });
        weapon.add(blade2);
        var grip = capsule(0.018 * s, 0.06 * s, 0x2a2a2a, { roughness: 0.8 });
        grip.position.y = -0.11 * s;
        weapon.add(grip);
        weapon.position.set(0, -0.28 * s, 0.05 * s);
        break;
      }
      case "gamora": {
        // Espada
        var sb = box2(0.035 * s, 0.34 * s, 0.07 * s, 0xe0e6f0, { metalness: 0.95, roughness: 0.15 });
        weapon.add(sb);
        var guard2 = torus(0.06 * s, 0.014 * s, accent, { suit: true });
        guard2.rotation.x = Math.PI / 2;
        guard2.position.y = -0.18 * s;
        weapon.add(guard2);
        var hilt = capsule(0.02 * s, 0.08 * s, 0x1a1a1a, { roughness: 0.8 });
        hilt.position.y = -0.24 * s;
        weapon.add(hilt);
        weapon.position.set(0, -0.24 * s, 0.05 * s);
        break;
      }
      case "loki": {
        // Cayado
        var staff = capsule(0.02 * s, 0.5 * s, 0x1f6f3f, { suit: true, metalness: 0.7 });
        weapon.add(staff);
        var orb = sphere(0.06 * s, 0x8fd8ff, { emissive: 0x8fd8ff, emissiveIntensity: 1.8, transparent: true, opacity: 0.85 });
        orb.position.y = 0.28 * s;
        weapon.add(orb);
        var collar = torus(0.07 * s, 0.018 * s, accent, { suit: true });
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.22 * s;
        weapon.add(collar);
        weapon.position.set(0.02 * s, -0.1 * s, 0.04 * s);
        break;
      }
      case "strange": {
        // Círculo mágico
        var spell = torus(0.12 * s, 0.012 * s, 0xffa020, { emissive: 0xffa020, emissiveIntensity: 2 });
        spell.rotation.x = Math.PI / 2;
        spell.position.set(0, -0.28 * s, 0.14 * s);
        weapon.add(spell);
        var spell2 = torus(0.08 * s, 0.01 * s, 0xffd060, { emissive: 0xffd060, emissiveIntensity: 2 });
        spell2.rotation.x = Math.PI / 2;
        spell2.position.copy(spell.position);
        weapon.add(spell2);
        weapon.userData.spell = spell;
        weapon.userData.spell2 = spell2;
        weapon.position.set(-0.02 * s, -0.16 * s, 0.1 * s);
        break;
      }
      case "wanda": {
        // Orbes de hechicería
        var orb1 = sphere(0.05 * s, accent, { emissive: accent, emissiveIntensity: 2, transparent: true, opacity: 0.8 });
        orb1.position.set(0.02 * s, -0.28 * s, 0.1 * s);
        weapon.add(orb1);
        weapon.userData.orb = orb1;
        weapon.position.set(0, 0, 0);
        break;
      }
      case "falcon": {
        // Blaster corto
        var g = box2(0.05 * s, 0.07 * s, 0.2 * s, 0x33333c, { metalness: 0.7, roughness: 0.35 });
        weapon.add(g);
        var muzzle = sphere(0.022 * s, accent, { emissive: accent, emissiveIntensity: 1.4 });
        muzzle.position.z = 0.11 * s;
        weapon.add(muzzle);
        weapon.position.set(0, -0.26 * s, 0.1 * s);
        break;
      }
      case "starlord": {
        // Blasters dobles
        var bl = box2(0.045 * s, 0.06 * s, 0.16 * s, 0x5a5a66, { metalness: 0.8, roughness: 0.3 });
        weapon.add(bl);
        var muz = sphere(0.02 * s, accent, { emissive: accent, emissiveIntensity: 1.6 });
        muz.position.z = 0.09 * s;
        weapon.add(muz);
        weapon.position.set(0, -0.26 * s, 0.08 * s);
        break;
      }
      case "rocket": {
        // Escopeta
        var barrel2 = capsule(0.026 * s, 0.34 * s, 0x3a3a44, { metalness: 0.8, roughness: 0.3 });
        barrel2.rotation.x = Math.PI / 2;
        barrel2.position.z = 0.14 * s;
        weapon.add(barrel2);
        var stock2 = box2(0.05 * s, 0.08 * s, 0.12 * s, 0x5a4632, { roughness: 0.8 });
        stock2.position.set(0, -0.03 * s, -0.02 * s);
        weapon.add(stock2);
        weapon.position.set(0, -0.24 * s, 0.04 * s);
        break;
      }
      case "bucky": {
        // Brazo metálico con cuchillo plegable
        var armMetal = capsule(0.055 * s, 0.1 * s, 0xb0b4c0, { metalness: 0.95, roughness: 0.25 });
        armMetal.position.set(0, -0.1 * s, 0);
        weapon.add(armMetal);
        var knife = box2(0.02 * s, 0.14 * s, 0.045 * s, 0xd8dde6, { metalness: 0.95, roughness: 0.2 });
        knife.position.set(0, -0.26 * s, 0.03 * s);
        weapon.add(knife);
        weapon.position.set(0, -0.14 * s, 0.02 * s);
        break;
      }
      case "ultron": {
        // Cañones de brazo
        var c = capsule(0.04 * s, 0.16 * s, 0x6a6a76, { metalness: 0.95, roughness: 0.2 });
        weapon.add(c);
        var em = sphere(0.03 * s, accent, { emissive: accent, emissiveIntensity: 2.2 });
        em.position.z = 0.1 * s;
        weapon.add(em);
        weapon.position.set(0, -0.24 * s, 0.06 * s);
        break;
      }
      case "vision":
      case "panther":
      case "antman":
      case "mk2":
      case "ironman":
      case "warmachine": {
        // Repulsor en la palma
        var rep = sphere(0.045 * s, accent, { emissive: accent, emissiveIntensity: 2.2, transparent: true, opacity: 0.9 });
        rep.position.set(0, -0.26 * s, 0.06 * s);
        weapon.add(rep);
        weapon.userData.repulsor = rep;
        weapon.position.set(0, -0.12 * s, 0.02 * s);
        break;
      }
      default: {
        if (klass.id === "sniper") {
          var barrel = capsule(0.032 * s, 0.4 * s, 0x2a2a34, { metalness: 0.8, roughness: 0.3 });
          barrel.rotation.x = Math.PI / 2;
          barrel.position.z = 0.22 * s;
          weapon.add(barrel);
          var tip = sphere(0.035 * s, accent, { emissive: accent, emissiveIntensity: 1.8 });
          tip.position.z = 0.42 * s;
          weapon.add(tip);
          var grip = capsule(0.022 * s, 0.1 * s, 0x1a1a22, { metalness: 0.6, roughness: 0.5 });
          grip.position.set(0, -0.08 * s, 0.08 * s);
          weapon.add(grip);
          weapon.position.set(0, -0.22 * s, 0.04 * s);
        } else if (klass.id === "agile") {
          var blade = capsule(0.022 * s, 0.28 * s, accent, { suit: true, emissive: accent, emissiveIntensity: 0.8 });
          blade.position.set(0, -0.26 * s, 0.06 * s);
          weapon.add(blade);
        }
        weapon.position.set(weapon.position.x, weapon.position.y - 0.1 * s, weapon.position.z);
      }
    }

    armHi.elbow.add(weapon);
    return weapon;
  }

  /** Caja con bordes suavizados (para armas). */
  function box2(w, h, d, color, opts) {
    // Se usa una capsula achatada para evitar cantos duros.
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
    return m;
  }

  function partsTag(obj, tag) {
    obj.userData.tag = tag;
  }

  /* ------------------------------------------------------------------ *
   * Extras iconicos por personaje
   * ------------------------------------------------------------------ */

  function addCharacterExtras(char, s, group, torso, armLo, armHi, parts, suit, accent) {
    switch (char.id) {
      case "thor": {
        // Alas en el casco
        [-1, 1].forEach(function (side) {
          var wing = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.2 * s, 8), mat(0xffffff, { metalness: 0.6, roughness: 0.4 }));
          wing.position.set(side * 0.24 * s, 1.3 * s, -0.02 * s);
          wing.rotation.z = side * -0.5;
          group.add(wing);
        });
        break;
      }
      case "cap": {
        // "A" en la frente
        var a = box2(0.02 * s, 0.06 * s, 0.012 * s, 0xffffff, { suit: true });
        a.position.set(0, 1.36 * s, 0.22 * s);
        group.add(a);
        var a2 = box2(0.05 * s, 0.02 * s, 0.012 * s, 0xffffff, { suit: true });
        a2.position.set(0, 1.36 * s, 0.22 * s);
        group.add(a2);
        break;
      }
      case "hulk": {
        // Pantalones morados rotos
        var pants = capsule(0.17 * s, 0.08 * s, 0x6b2f8f, { roughness: 0.9 });
        pants.position.y = 0.56 * s;
        group.add(pants);
        // Venas / músculo en brazos
        [-1, 1].forEach(function (side) {
          var muscle = sphere(0.06 * s, 0x4caf50, { roughness: 0.75 });
          muscle.position.set(side * 0.23 * s, 1.0 * s, 0);
          group.add(muscle);
        });
        break;
      }
      case "groot": {
        // Ramas en la cabeza
        for (var i = 0; i < 4; i++) {
          var br = capsule(0.02 * s, 0.12 * s, 0x4a3520, { roughness: 0.95 });
          br.position.set((i - 1.5) * 0.09 * s, 1.5 * s + (i % 2) * 0.04 * s, -0.02 * s);
          br.rotation.z = (i - 1.5) * 0.18;
          group.add(br);
        }
        break;
      }
      case "rocket": {
        // Cola
        var tail = capsule(0.035 * s, 0.24 * s, 0x6a5a3a, { roughness: 0.9 });
        tail.position.set(0, 0.5 * s, -0.16 * s);
        tail.rotation.x = 0.9;
        group.add(tail);
        parts.tail = tail;
        // Orejas de mapache
        [-1, 1].forEach(function (side) {
          var ear = sphere(0.05 * s, 0x6a5a3a, { roughness: 0.9 });
          ear.scale.set(1, 1.2, 0.6);
          ear.position.set(side * 0.16 * s, 1.44 * s, 0);
          group.add(ear);
        });
        break;
      }
      case "falcon": {
        // Alas plegadas a la espalda
        [-1, 1].forEach(function (side) {
          var wing = box2(0.04 * s, 0.34 * s, 0.18 * s, 0x8a8a92, { metalness: 0.6, roughness: 0.4 });
          wing.position.set(side * 0.2 * s, 0.95 * s, -0.2 * s);
          wing.rotation.z = side * 0.25;
          group.add(wing);
        });
        break;
      }
      case "vision": {
        // Gema en la frente
        var gem = sphere(0.04 * s, 0xff2222, { emissive: 0xff2222, emissiveIntensity: 2.4 });
        gem.position.set(0, 1.4 * s, 0.2 * s);
        group.add(gem);
        parts.gem = gem;
        break;
      }
      case "venom": {
        // Simbolo de araña en el pecho
        var symb = sphere(0.1 * s, 0xffffff, { roughness: 0.6 });
        symb.scale.set(1.3, 1.1, 0.35);
        symb.position.set(0, 0.92 * s, 0.17 * s);
        group.add(symb);
        break;
      }
      case "bucky": {
        // Brazo metálico (izquierdo)
        var metalArm = capsule(0.062 * s, 0.2 * s, 0xb0b4c0, { metalness: 0.95, roughness: 0.25 });
        metalArm.position.set(-0.23 * s, 0.86 * s, 0);
        group.add(metalArm);
        // Star roja en el hombro
        var starR = sphere(0.03 * s, 0xcc2222, { roughness: 0.6 });
        starR.scale.set(1, 1, 0.4);
        starR.position.set(-0.23 * s, 1.02 * s, 0.09 * s);
        group.add(starR);
        break;
      }
      case "starlord": {
        // Botas cohete
        [-1, 1].forEach(function (side) {
          var jet = sphere(0.04 * s, 0xff8844, { emissive: 0xff8844, emissiveIntensity: 1.6 });
          jet.scale.set(1, 1.4, 1);
          jet.position.set(side * 0.1 * s, 0.02 * s, -0.05 * s);
          group.add(jet);
        });
        break;
      }
      case "nova": {
        // Visor de Nova
        var visor = torus(0.1 * s, 0.02 * s, accent, { suit: true, emissive: accent, emissiveIntensity: 0.6 });
        visor.position.set(0, 1.28 * s, 0.19 * s);
        group.add(visor);
        break;
      }
      case "drax": {
        // Marcas/tatuajes rojos
        [-1, 1].forEach(function (side) {
          var tat = torus(0.07 * s, 0.012 * s, 0xaa3322, { roughness: 0.8 });
          tat.rotation.set(0, side * 0.4, Math.PI / 2);
          tat.position.set(side * 0.2 * s, 0.9 * s, 0.08 * s);
          group.add(tat);
        });
        break;
      }
      case "loki": {
        // Capa verde
        var capeL = buildCape(group, 0x1f6f3f, s);
        parts.cape = capeL;
        break;
      }
      default:
        break;
    }
  }

  /** Estatua de menu: mismo modelo en pose de presentacion. */
  function buildStatue(char) {
    var built = buildHero(char);
    built.parts.armL.rotation.x = -0.5;
    built.parts.armR.rotation.x = -0.2;
    built.parts.legL.rotation.x = 0.08;
    built.parts.legR.rotation.x = -0.08;
    return built;
  }

  /**
   * Hoja de sprites -> dataURL por personaje (para el menu).
   * Devuelve un array de { id, url } en cuanto la imagen carga.
   */
  function spriteSheet(callback) {
    var img = new Image();
    img.onload = function () {
      var out = [];
      CHARACTERS.forEach(function (c) {
        if (c.skin3d || c.idx === undefined) {
          out.push({ id: c.id, url: null });
          return;
        }
        var col = c.idx % SPRITE_COLS;
        var row = Math.floor(c.idx / SPRITE_COLS);
        try {
          var cv = document.createElement("canvas");
          cv.width = SPRITE_SIZE;
          cv.height = SPRITE_SIZE;
          var cx = cv.getContext("2d");
          cx.drawImage(img, col * SPRITE_SIZE, row * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
          out.push({ id: c.id, url: cv.toDataURL("image/png") });
        } catch (e) {
          out.push({ id: c.id, url: null });
        }
      });
      callback(out);
    };
    img.onerror = function () {
      callback(null);
    };
    img.src = "data:image/png;base64," + (window.SPRITE_B64 || "");
  }

  window.CHARACTERS = CHARACTERS;
  window.CLASSES = CLASSES;
  window.Models3D = {
    getChar: getChar,
    getClass: getClass,
    buildHero: buildHero,
    buildStatue: buildStatue,
    spriteSheet: spriteSheet,
    mat: mat
  };
})();
