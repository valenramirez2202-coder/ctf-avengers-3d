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
   *
   * acc = { hat, cape, outfit, face } -> accesorios gratuitos del jugador.
   * Un "outfit" recolorea el traje (cloth/trim) sin tocar la cabeza ni el
   * arma, para que el heroe siga siendo reconocible.
   */
  function buildHero(char, acc) {
    var klass = getClass(char.klass);
    var s = char.big || 1;
    var heroSuit = char.suit;
    var heroAccent = char.accent;
    var skin = char.skin;

    var outfitDef = acc && acc.outfit ? accessoryById(acc.outfit) : null;
    var suit = outfitDef && outfitDef.suitColor != null ? outfitDef.suitColor : char.suit;
    var accent = outfitDef && outfitDef.trimColor != null ? outfitDef.trimColor : char.accent;

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
      var core = sphere(0.055 * s, heroAccent, { emissive: heroAccent, emissiveIntensity: 2.4 }, 16);
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

    // ---- rasgos segun el tipo de cabeza (siempre los del heroe) ----
    buildHead(headShape, char, s, heroSuit, heroAccent, skin);

    // ---- capa: la del personaje o la elegida por el jugador ----
    var accCape = acc && acc.cape ? accessoryById(acc.cape) : null;
    if (accCape) {
      parts.cape = buildAccCape(group, s, accCape);
    } else if (char.cape) {
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
    parts.weapon = buildWeapon(char, klass, s, heroAccent, armHi);

    // ---- extras iconicos por personaje ----
    addCharacterExtras(char, s, group, torso, armLo, armHi, parts, heroSuit, heroAccent);

    // ---- accesorios gratuitos elegidos en el menu ----
    if (outfitDef) applyOutfitExtras(group, torso, s, outfitDef);
    var accFace = acc && acc.face ? accessoryById(acc.face) : null;
    if (accFace) buildFaceAcc(headShape, s, accFace, heroAccent);
    var accHat = acc && acc.hat ? accessoryById(acc.hat) : null;
    if (accHat) buildHatAcc(headShape, s, accHat);

    group.userData.height = 1.62 * s;
    group.userData.acc = acc || null;
    return { group: group, parts: parts, klass: klass, scale: s };
  }

  /* ------------------------------------------------------------------ *
   * Accesorios gratuitos (sombreros, capas, ropa y cara)
   * ------------------------------------------------------------------ */

  function accessoryById(id) {
    if (!id) return null;
    if (window.ACCESSORIES) {
      for (var i = 0; i < window.ACCESSORIES.length; i++) {
        if (window.ACCESSORIES[i].id === id) return window.ACCESSORIES[i];
      }
    }
    return null;
  }

  /** Media esfera (base de cascos y gorros). */
  function hemi(r, color, opts) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(color, opts)
    );
  }

  /** Cilindro (coronas, sombreros, botas). */
  function cyl(rt, rb, h, color, opts, seg) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 22), mat(color, opts));
  }

  /** Cono (puntas de gorros, cuernos, picos). */
  function cone(r, h, color, opts, seg) {
    return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 18), mat(color, opts));
  }

  /**
   * SOMBREROS: se colocan sobre headShape (craneo de radio 0.3*s, asi que
   * la "linea del pelo" esta en y ~ 0.27*s).
   */
  function buildHatAcc(head, s, def) {
    var g = new THREE.Group();
    var c = def.color;
    var base = 0.26 * s;
    var shape = def.shape;

    switch (shape) {
      case "tophat": {
        var brim = cyl(0.34 * s, 0.34 * s, 0.035 * s, c, { suit: true });
        brim.position.y = base;
        g.add(brim);
        var crown = cyl(0.2 * s, 0.21 * s, 0.3 * s, c, { suit: true });
        crown.position.y = base + 0.16 * s;
        g.add(crown);
        var band = cyl(0.215 * s, 0.215 * s, 0.055 * s, 0xd02030, { suit: true });
        band.position.y = base + 0.05 * s;
        g.add(band);
        break;
      }
      case "party": {
        var pcone = cone(0.2 * s, 0.44 * s, c, { suit: true });
        pcone.position.y = base + 0.2 * s;
        pcone.rotation.z = 0.14;
        g.add(pcone);
        for (var i = 0; i < 2; i++) {
          var rr = (0.16 - i * 0.05) * s;
          var stripe = cyl(rr * 0.85, rr, 0.05 * s, i % 2 ? 0xffe14d : 0x22d3ee, { suit: true });
          stripe.position.y = base + 0.12 * s + i * 0.13 * s;
          stripe.rotation.z = 0.14;
          g.add(stripe);
        }
        var pom = sphere(0.06 * s, 0xffffff, { roughness: 0.9 }, 14);
        pom.position.set(0.06 * s, base + 0.42 * s, 0);
        g.add(pom);
        break;
      }
      case "panama": {
        var brim2 = cyl(0.5 * s, 0.52 * s, 0.03 * s, c, { suit: true, roughness: 0.85 });
        brim2.position.y = base;
        g.add(brim2);
        var crown2 = cyl(0.22 * s, 0.24 * s, 0.16 * s, c, { suit: true, roughness: 0.85 });
        crown2.position.y = base + 0.09 * s;
        g.add(crown2);
        var band2 = cyl(0.245 * s, 0.245 * s, 0.045 * s, 0x1a3a8a, { suit: true });
        band2.position.y = base + 0.03 * s;
        g.add(band2);
        break;
      }
      case "crown": {
        var ring = cyl(0.24 * s, 0.24 * s, 0.11 * s, c, { suit: true, metalness: 0.9, roughness: 0.2 });
        ring.position.y = base + 0.05 * s;
        g.add(ring);
        for (var k = 0; k < 6; k++) {
          var sp = cone(0.05 * s, 0.14 * s, c, { suit: true, metalness: 0.9, roughness: 0.2 }, 8);
          var a = (k / 6) * Math.PI * 2;
          sp.position.set(Math.cos(a) * 0.2 * s, base + 0.16 * s, Math.sin(a) * 0.2 * s);
          g.add(sp);
          var gem = sphere(0.032 * s, k % 2 ? 0xff2f6b : 0x22d3ee, { emissive: k % 2 ? 0xff2f6b : 0x22d3ee, emissiveIntensity: 0.8 }, 10);
          gem.position.set(Math.cos(a) * 0.225 * s, base + 0.05 * s, Math.sin(a) * 0.225 * s);
          g.add(gem);
        }
        break;
      }
      case "viking": {
        var dome = hemi(0.32 * s, c, { suit: true, metalness: 0.7, roughness: 0.3 });
        dome.position.y = base - 0.02 * s;
        g.add(dome);
        var rim = torus(0.31 * s, 0.035 * s, 0x4a3a24, { suit: true });
        rim.rotation.x = Math.PI / 2;
        rim.position.y = base;
        g.add(rim);
        [-1, 1].forEach(function (side) {
          var horn = cone(0.07 * s, 0.3 * s, 0xf0e6d0, { roughness: 0.55 }, 12);
          horn.position.set(side * 0.3 * s, base + 0.13 * s, 0);
          horn.rotation.z = -side * 0.7;
          horn.rotation.x = -0.2;
          g.add(horn);
        });
        var nose = box2(0.05 * s, 0.18 * s, 0.05 * s, c, { suit: true, metalness: 0.7 });
        nose.position.set(0, base - 0.07 * s, 0.29 * s);
        g.add(nose);
        break;
      }
      case "cowboy": {
        var brim3 = cyl(0.5 * s, 0.52 * s, 0.035 * s, c, { suit: true, roughness: 0.85 });
        brim3.position.y = base;
        brim3.rotation.x = 0.06;
        g.add(brim3);
        [-1, 1].forEach(function (side) {
          var curl = torus(0.24 * s, 0.045 * s, c, { suit: true, roughness: 0.85 }, Math.PI);
          curl.position.set(side * 0.26 * s, base + 0.06 * s, 0);
          curl.rotation.y = Math.PI / 2;
          curl.rotation.z = side > 0 ? 0 : Math.PI;
          g.add(curl);
        });
        var crown3 = cyl(0.21 * s, 0.25 * s, 0.24 * s, c, { suit: true, roughness: 0.85 });
        crown3.position.y = base + 0.13 * s;
        g.add(crown3);
        var dent = sphere(0.1 * s, c, { suit: true, roughness: 0.85 });
        dent.scale.set(1, 0.4, 1.7);
        dent.position.y = base + 0.25 * s;
        g.add(dent);
        var band3 = cyl(0.255 * s, 0.255 * s, 0.05 * s, 0x2a1a10, { suit: true });
        band3.position.y = base + 0.04 * s;
        g.add(band3);
        break;
      }
      case "witch": {
        var brim4 = cyl(0.46 * s, 0.48 * s, 0.03 * s, c, { suit: true, roughness: 0.8 });
        brim4.position.y = base;
        brim4.rotation.z = 0.08;
        g.add(brim4);
        var wcone = cone(0.2 * s, 0.5 * s, c, { suit: true, roughness: 0.8 });
        wcone.position.set(0.03 * s, base + 0.24 * s, 0);
        wcone.rotation.z = -0.34;
        g.add(wcone);
        var wband = cyl(0.21 * s, 0.21 * s, 0.06 * s, 0xffd700, { suit: true });
        wband.position.y = base + 0.04 * s;
        g.add(wband);
        var buckle = box2(0.08 * s, 0.07 * s, 0.03 * s, 0xffd700, { metalness: 0.85, roughness: 0.25 });
        buckle.position.set(0, base + 0.04 * s, 0.2 * s);
        g.add(buckle);
        break;
      }
      case "chef": {
        var band4 = cyl(0.29 * s, 0.3 * s, 0.1 * s, 0xf0f0f0, { suit: true, roughness: 0.9 });
        band4.position.y = base + 0.04 * s;
        g.add(band4);
        [[0, 0.1], [-0.14, 0.04], [0.14, 0.04], [0, -0.12]].forEach(function (p) {
          var puff = sphere(0.15 * s, 0xfafafa, { roughness: 0.95 }, 16);
          puff.position.set(p[0] * s, base + 0.16 * s + p[1] * s, p[1] * 0.6 * s);
          g.add(puff);
        });
        break;
      }
      case "beanie": {
        var dome2 = hemi(0.32 * s, c, { suit: false, roughness: 0.95 });
        dome2.position.y = base - 0.02 * s;
        g.add(dome2);
        var fold = torus(0.3 * s, 0.055 * s, c, { roughness: 0.95 });
        fold.rotation.x = Math.PI / 2;
        fold.position.y = base + 0.02 * s;
        g.add(fold);
        var ball = sphere(0.08 * s, 0xff5f7a, { roughness: 0.95 }, 14);
        ball.position.y = base + 0.3 * s;
        g.add(ball);
        break;
      }
      case "headphones": {
        var arc = new THREE.Mesh(
          new THREE.TorusGeometry(0.32 * s, 0.035 * s, 8, 24, Math.PI),
          mat(c, { suit: true })
        );
        arc.position.y = base;
        g.add(arc);
        [-1, 1].forEach(function (side) {
          var cup = cyl(0.1 * s, 0.1 * s, 0.07 * s, c, { suit: true });
          cup.rotation.z = Math.PI / 2;
          cup.position.set(side * 0.31 * s, base - 0.02 * s, 0);
          g.add(cup);
          var pad = torus(0.085 * s, 0.03 * s, 0xff3b6b, { suit: true });
          pad.rotation.y = Math.PI / 2;
          pad.position.set(side * 0.34 * s, base - 0.02 * s, 0);
          g.add(pad);
        });
        break;
      }
      case "ears": {
        var band5 = torus(0.3 * s, 0.035 * s, 0xfff0f4, { roughness: 0.9 });
        band5.rotation.x = Math.PI / 2;
        band5.position.y = base;
        g.add(band5);
        [-1, 1].forEach(function (side) {
          var ear = sphere(0.1 * s, c, { roughness: 0.9 }, 16);
          ear.scale.set(0.55, 1.9, 0.4);
          ear.position.set(side * 0.17 * s, base + 0.24 * s, 0);
          ear.rotation.z = -side * 0.16;
          g.add(ear);
          var inner = sphere(0.055 * s, 0xff9fc0, { roughness: 0.9 }, 12);
          inner.scale.set(0.5, 1.7, 0.3);
          inner.position.set(side * 0.17 * s, base + 0.24 * s, 0.04 * s);
          inner.rotation.z = -side * 0.16;
          g.add(inner);
        });
        break;
      }
      case "horns": {
        var band6 = torus(0.3 * s, 0.04 * s, c, { suit: true });
        band6.rotation.x = Math.PI / 2;
        band6.position.y = base;
        g.add(band6);
        [-1, 1].forEach(function (side) {
          var horn2 = cone(0.08 * s, 0.3 * s, 0x8a1420, { roughness: 0.5 }, 12);
          horn2.position.set(side * 0.22 * s, base + 0.14 * s, 0);
          horn2.rotation.z = -side * 0.5;
          g.add(horn2);
        });
        break;
      }
      case "racer": {
        var shell = hemi(0.33 * s, c, { suit: true, metalness: 0.5, roughness: 0.25 });
        shell.position.y = base - 0.03 * s;
        g.add(shell);
        var visor = sphere(0.2 * s, 0x101418, { metalness: 0.4, roughness: 0.1 }, 16);
        visor.scale.set(1.05, 0.6, 0.7);
        visor.position.set(0, base - 0.03 * s, 0.2 * s);
        g.add(visor);
        var stripe2 = box2(0.06 * s, 0.02 * s, 0.32 * s, 0xffffff, { suit: true });
        stripe2.position.set(0, base + 0.16 * s, 0.06 * s);
        g.add(stripe2);
        break;
      }
      case "mariachi": {
        var brim5 = cyl(0.72 * s, 0.76 * s, 0.03 * s, c, { suit: true, roughness: 0.9 });
        brim5.position.y = base;
        brim5.rotation.z = 0.05;
        g.add(brim5);
        var crown5 = cone(0.24 * s, 0.34 * s, c, { suit: true, roughness: 0.9 });
        crown5.position.y = base + 0.17 * s;
        g.add(crown5);
        var trim5 = torus(0.245 * s, 0.03 * s, 0xffd700, { suit: true, metalness: 0.7 });
        trim5.rotation.x = Math.PI / 2;
        trim5.position.y = base + 0.03 * s;
        g.add(trim5);
        for (var m = 0; m < 8; m++) {
          var dot = sphere(0.03 * s, 0xffd700, { emissive: 0xffd700, emissiveIntensity: 0.5 }, 8);
          var ang = (m / 8) * Math.PI * 2;
          dot.position.set(Math.cos(ang) * 0.6 * s, base + 0.01 * s, Math.sin(ang) * 0.6 * s);
          g.add(dot);
        }
        break;
      }
      case "flower": {
        var band7 = torus(0.3 * s, 0.04 * s, 0x2f8f3f, { roughness: 0.9 });
        band7.rotation.x = Math.PI / 2;
        band7.position.y = base;
        g.add(band7);
        for (var f = 0; f < 7; f++) {
          var fa = (f / 7) * Math.PI * 2;
          var petals = new THREE.Group();
          for (var pi = 0; pi < 5; pi++) {
            var pet = sphere(0.045 * s, f % 2 ? 0xff6fa8 : 0xffe14d, { roughness: 0.75 }, 10);
            pet.scale.set(1, 0.5, 1);
            pet.position.set(Math.cos((pi / 5) * Math.PI * 2) * 0.05 * s, 0, Math.sin((pi / 5) * Math.PI * 2) * 0.05 * s);
            petals.add(pet);
          }
          petals.position.set(Math.cos(fa) * 0.29 * s, base + 0.03 * s, Math.sin(fa) * 0.29 * s);
          g.add(petals);
        }
        break;
      }
      default: {
        var plain = hemi(0.31 * s, c, { suit: true });
        plain.position.y = base;
        g.add(plain);
      }
    }

    head.add(g);
    return g;
  }

  /**
   * CAPAS: se montan en el grupo raiz (mismo anclaje que la capa original).
   * devolvemos el mesh animable para que game3d.js lo haga ondear.
   */
  function buildAccCape(group, s, def) {
    var c = def.color;
    var shape = def.shape;

    // El pivote va en los hombros: asi game3d.js puede hacer ondear la capa
    // rotando parts.cape igual que con la capa original del personaje.
    var holder = new THREE.Group();
    holder.position.set(0, 0.78 * s, -0.18 * s);
    group.add(holder);

    if (shape === "wings") {
      [-1, 1].forEach(function (side) {
        var geo = new THREE.PlaneGeometry(0.5 * s, 0.72 * s, 3, 3);
        var pos = geo.attributes.position;
        for (var i = 0; i < pos.count; i++) {
          var y = pos.getY(i);
          var t = (0.36 * s - y) / (0.72 * s);
          // dientes de murcielago en el borde inferior
          pos.setY(i, y - (Math.abs(pos.getX(i)) > 0.12 * s && t > 0.55 ? 0.16 * s : 0));
          pos.setZ(i, -t * t * 0.26 * s);
        }
        geo.computeVertexNormals();
        var wing = new THREE.Mesh(geo, mat(c, { suit: true, roughness: 0.7 }));
        wing.material.side = THREE.DoubleSide;
        wing.position.set(side * 0.24 * s, 0.02 * s, 0.02 * s);
        wing.rotation.y = side * 0.34;
        holder.add(wing);
      });
      return holder;
    }

    var long = shape === "long" || shape === "royal" || shape === "rainbow" || shape === "flag" || shape === "towel";
    var width = shape === "ruana" ? 0.62 * s : long ? 0.44 * s : 0.52 * s;
    var height = shape === "ruana" ? 0.52 * s : shape === "towel" ? 0.66 * s : 0.84 * s;
    var flare = shape === "ruana" ? 0.55 : 0.35;

    function cloth(color, yRel, h, w) {
      var geo = new THREE.PlaneGeometry(w, h, 6, 8);
      var pos = geo.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        var y = pos.getY(i);
        var t = (h / 2 - y) / h;
        pos.setZ(i, -t * t * 0.32 * s);
        pos.setX(i, pos.getX(i) * (1 + t * flare));
      }
      geo.computeVertexNormals();
      var mesh = new THREE.Mesh(geo, mat(color, { suit: true, roughness: 0.75 }));
      mesh.material.side = THREE.DoubleSide;
      mesh.position.y = yRel;
      holder.add(mesh);
      return mesh;
    }

    var bands = null;
    if (shape === "stripe" || shape === "rainbow" || shape === "flag") {
      bands = shape === "rainbow"
        ? [0xff3b3b, 0xff9f1c, 0xffe14d, 0x3fd07a, 0x3aa0ff, 0x9b5cff]
        : shape === "flag"
          ? [0xffffff, 0xff3b6b, 0x2244cc]
          : [0xffe14d, 0xffffff, 0x2fbf9f, 0xff8a3d];
    }

    if (bands) {
      var seg = height / bands.length;
      bands.forEach(function (col, i) {
        cloth(col, -height / 2 + seg * (i + 0.5), seg * 1.04, width);
      });
    } else {
      cloth(c, 0, height, width);
    }

    if (shape === "royal") {
      var fur = torus(0.24 * s, 0.075 * s, 0xfafafa, { roughness: 0.98 });
      fur.rotation.x = Math.PI / 2;
      fur.position.set(0, 0.34 * s, 0.16 * s);
      holder.add(fur);
    }

    if (shape === "hood") {
      var hood = hemi(0.3 * s, c, { suit: true, roughness: 0.85 });
      hood.position.set(0, 0.4 * s, 0.08 * s);
      hood.rotation.x = -0.5;
      holder.add(hood);
    }

    if (shape === "ruana") {
      // cuello tejido: se ve por delante tambien
      var collar = torus(0.23 * s, 0.07 * s, c, { suit: true, roughness: 0.95 });
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.28 * s, 0.18 * s);
      holder.add(collar);
    }

    return holder;
  }

  /**
   * ROPA CHISTOSA: recolorear ya se hizo al construir el cuerpo; aqui solo
   * añadimos los detalles que la hacen reconocible.
   */
  function applyOutfitExtras(group, torso, s, def) {
    var c = def.color;
    var extra = def.extra;

    switch (extra) {
      case "collar": {
        // volante de plumas del pollo
        for (var i = 0; i < 12; i++) {
          var a = (i / 12) * Math.PI * 2;
          var plume = sphere(0.075 * s, i % 2 ? 0xffffff : 0xfff0d0, { roughness: 0.9 }, 10);
          plume.scale.set(1, 0.7, 1);
          plume.position.set(Math.cos(a) * 0.24 * s, 0.44 * s, Math.sin(a) * 0.2 * s);
          torso.add(plume);
        }
        break;
      }
      case "buttons": {
        for (var b = 0; b < 3; b++) {
          var btn = sphere(0.055 * s, b % 2 ? 0xffe14d : 0x36e0a0, { roughness: 0.4 }, 12);
          btn.position.set(0, 0.32 * s - b * 0.11 * s, 0.2 * s);
          torso.add(btn);
        }
        var ruff = torus(0.2 * s, 0.06 * s, 0xffffff, { suit: true });
        ruff.rotation.x = Math.PI / 2;
        ruff.position.y = 0.45 * s;
        torso.add(ruff);
        break;
      }
      case "spikes": {
        // dorsales del dinosaurio por la espalda
        for (var d = 0; d < 5; d++) {
          var sp2 = cone(0.055 * s, 0.16 * s, def.trimColor || 0x9be15d, { suit: true, roughness: 0.6 }, 4);
          sp2.position.set(0, 0.42 * s - d * 0.1 * s, -0.16 * s - d * 0.01 * s);
          sp2.rotation.x = -0.4;
          torso.add(sp2);
        }
        var tail = cone(0.11 * s, 0.42 * s, c, { suit: true });
        tail.rotation.x = Math.PI / 2 + 0.35;
        tail.position.set(0, 0.06 * s, -0.3 * s);
        torso.add(tail);
        break;
      }
      case "stripes": {
        var col = def.trimColor || 0x1c1c1c;
        for (var t2 = 0; t2 < 4; t2++) {
          var ring = torus(0.2 * s, 0.028 * s, col, { suit: true });
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.1 * s + t2 * 0.1 * s;
          ring.scale.set(1, 1, 0.86);
          torso.add(ring);
        }
        break;
      }
      case "rainbow": {
        var rainbow = [0xff3b3b, 0xff9f1c, 0xffe14d, 0x3fd07a, 0x3aa0ff, 0x9b5cff];
        rainbow.forEach(function (col2, i2) {
          var band = torus(0.198 * s, 0.035 * s, col2, { suit: true, emissive: col2, emissiveIntensity: 0.25 });
          band.rotation.x = Math.PI / 2;
          band.position.y = 0.08 * s + i2 * 0.07 * s;
          band.scale.set(1, 1, 0.86);
          torso.add(band);
        });
        break;
      }
      case "tie": {
        var knot = box2(0.07 * s, 0.06 * s, 0.04 * s, 0xd02030, { roughness: 0.5 });
        knot.position.set(0, 0.38 * s, 0.2 * s);
        torso.add(knot);
        var tieBody = cone(0.07 * s, 0.26 * s, 0xd02030, { roughness: 0.5 }, 4);
        tieBody.rotation.x = Math.PI;
        tieBody.position.set(0, 0.24 * s, 0.2 * s);
        torso.add(tieBody);
        var pocket = box2(0.08 * s, 0.05 * s, 0.02 * s, 0xffffff, { roughness: 0.7 });
        pocket.position.set(0.12 * s, 0.3 * s, 0.19 * s);
        torso.add(pocket);
        break;
      }
      case "beltbig": {
        var mawashi = cyl(0.235 * s, 0.245 * s, 0.18 * s, 0xffffff, { suit: true, roughness: 0.9 });
        mawashi.position.y = 0.1 * s;
        torso.add(mawashi);
        var knot2 = sphere(0.07 * s, def.trimColor || 0xdd2244, { roughness: 0.6 }, 12);
        knot2.position.set(0, 0.2 * s, 0.22 * s);
        torso.add(knot2);
        break;
      }
      case "horn": {
        var uni = cone(0.055 * s, 0.26 * s, 0xffd700, { metalness: 0.7, roughness: 0.25, emissive: 0xffd700, emissiveIntensity: 0.3 }, 10);
        uni.position.set(0, 0.3 * s, 0.19 * s);
        uni.rotation.x = -0.25;
        torso.add(uni);
        var mane = sphere(0.12 * s, def.trimColor || 0xa86bff, { roughness: 0.85 });
        mane.scale.set(0.5, 1.4, 0.4);
        mane.position.set(0, 0.34 * s, -0.2 * s);
        torso.add(mane);
        break;
      }
      case "tail": {
        var peel = cone(0.1 * s, 0.3 * s, def.trimColor || 0x6b4a12, { roughness: 0.8 }, 8);
        peel.rotation.x = Math.PI / 2 - 0.5;
        peel.position.set(0, 0.1 * s, -0.26 * s);
        torso.add(peel);
        break;
      }
      default:
        break;
    }
    return group;
  }

  /**
   * CARA: gafas, bigotes, narices y caretas. Se montan en headShape, por
   * delante de los ojos (z > 0.24*s).
   */
  function buildFaceAcc(head, s, def, heroAccent) {
    var g = new THREE.Group();
    var c = def.color;

    switch (def.shape) {
      case "shades": {
        [-1, 1].forEach(function (side) {
          var lens = sphere(0.11 * s, 0x101014, { metalness: 0.5, roughness: 0.1 }, 16);
          lens.scale.set(1, 0.78, 0.35);
          lens.position.set(side * 0.12 * s, 0.03 * s, 0.27 * s);
          g.add(lens);
          var arm = box2(0.1 * s, 0.022 * s, 0.022 * s, 0x101014, { suit: true });
          arm.position.set(side * 0.24 * s, 0.05 * s, 0.16 * s);
          arm.rotation.y = -side * 0.5;
          g.add(arm);
        });
        var bridge = box2(0.07 * s, 0.022 * s, 0.022 * s, 0x101014, { suit: true });
        bridge.position.set(0, 0.05 * s, 0.29 * s);
        g.add(bridge);
        break;
      }
      case "nerd": {
        [-1, 1].forEach(function (side) {
          var frame = torus(0.1 * s, 0.018 * s, 0x1a1a1a, { suit: true });
          frame.position.set(side * 0.12 * s, 0.03 * s, 0.27 * s);
          g.add(frame);
        });
        var bridge2 = box2(0.06 * s, 0.02 * s, 0.02 * s, 0x1a1a1a, { suit: true });
        bridge2.position.set(0, 0.04 * s, 0.28 * s);
        g.add(bridge2);
        [-1, 1].forEach(function (side) {
          var arm2 = box2(0.1 * s, 0.02 * s, 0.02 * s, 0x1a1a1a, { suit: true });
          arm2.position.set(side * 0.24 * s, 0.05 * s, 0.16 * s);
          arm2.rotation.y = -side * 0.5;
          g.add(arm2);
        });
        break;
      }
      case "mustache": {
        [-1, 1].forEach(function (side) {
          var half = sphere(0.085 * s, c, { roughness: 0.95 }, 14);
          half.scale.set(1.1, 0.5, 0.55);
          half.position.set(side * 0.075 * s, -0.11 * s, 0.25 * s);
          half.rotation.z = side * 0.3;
          g.add(half);
        });
        break;
      }
      case "disguise": {
        [-1, 1].forEach(function (side) {
          var lens2 = torus(0.095 * s, 0.028 * s, 0x2a2a2a, { suit: true });
          lens2.position.set(side * 0.12 * s, 0.04 * s, 0.27 * s);
          g.add(lens2);
          var half2 = sphere(0.09 * s, c, { roughness: 0.95 }, 14);
          half2.scale.set(1.1, 0.5, 0.55);
          half2.position.set(side * 0.08 * s, -0.11 * s, 0.25 * s);
          half2.rotation.z = side * 0.3;
          g.add(half2);
        });
        var bridge3 = box2(0.05 * s, 0.03 * s, 0.03 * s, 0x2a2a2a, { suit: true });
        bridge3.position.set(0, 0.05 * s, 0.28 * s);
        g.add(bridge3);
        var nose2 = sphere(0.07 * s, 0xd8a07a, { roughness: 0.8 }, 14);
        nose2.position.set(0, -0.05 * s, 0.3 * s);
        g.add(nose2);
        break;
      }
      case "clownnose": {
        var ball = sphere(0.085 * s, c, { emissive: c, emissiveIntensity: 0.35, roughness: 0.3 }, 16);
        ball.position.set(0, -0.03 * s, 0.31 * s);
        g.add(ball);
        break;
      }
      case "santa": {
        var beard = sphere(0.24 * s, c, { roughness: 1 }, 18);
        beard.scale.set(1.05, 1.1, 0.7);
        beard.position.set(0, -0.16 * s, 0.16 * s);
        g.add(beard);
        var mous = sphere(0.1 * s, 0xffffff, { roughness: 1 }, 14);
        mous.scale.set(1.3, 0.45, 0.5);
        mous.position.set(0, -0.08 * s, 0.27 * s);
        g.add(mous);
        break;
      }
      case "mask": {
        var bandMask = sphere(0.305 * s, c, { suit: true, roughness: 0.55 }, 20);
        bandMask.scale.set(1.01, 0.34, 1.01);
        bandMask.position.y = 0.03 * s;
        g.add(bandMask);
        [-1, 1].forEach(function (side) {
          var hole = sphere(0.075 * s, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 }, 12);
          hole.scale.set(1, 0.75, 0.4);
          hole.position.set(side * 0.1 * s, 0.04 * s, 0.29 * s);
          g.add(hole);
        });
        break;
      }
      case "cat": {
        [-1, 1].forEach(function (side) {
          for (var w = 0; w < 3; w++) {
            var whisk = capsule(0.008 * s, 0.16 * s, 0xffffff, { roughness: 0.9 });
            whisk.rotation.z = Math.PI / 2;
            whisk.rotation.y = side * (0.25 + w * 0.22);
            whisk.position.set(side * 0.19 * s, -0.06 * s - w * 0.03 * s, 0.24 * s);
            g.add(whisk);
          }
        });
        var nose3 = sphere(0.045 * s, c, { roughness: 0.5 }, 12);
        nose3.scale.set(1.2, 0.8, 0.8);
        nose3.position.set(0, -0.05 * s, 0.3 * s);
        g.add(nose3);
        break;
      }
      case "beak": {
        var upper = cone(0.085 * s, 0.16 * s, c, { roughness: 0.5 }, 12);
        upper.rotation.x = Math.PI / 2;
        upper.position.set(0, -0.04 * s, 0.32 * s);
        g.add(upper);
        var lower = cone(0.07 * s, 0.1 * s, 0xe08f10, { roughness: 0.5 }, 12);
        lower.rotation.x = -Math.PI / 2;
        lower.position.set(0, -0.1 * s, 0.3 * s);
        g.add(lower);
        break;
      }
      default:
        break;
    }

    head.add(g);
    return g;
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
        // Capa verde (solo si el jugador no ha elegido otra capa)
        if (!parts.cape) {
          var capeL = buildCape(group, 0x1f6f3f, s);
          parts.cape = capeL;
        }
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
