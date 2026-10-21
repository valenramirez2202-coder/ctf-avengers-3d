/**
 * Renderizador 3D (Three.js).
 *
 * Camaras:
 *   tactical -> vista fija con inclinacion, se ve todo el mapa (como el 2D)
 *   third    -> tercera persona siguiendo al jugador (el raton apunta)
 *   first    -> primera persona
 *   auto     -> tercera persona, y cambia sola a tactica cuando llevas la
 *               bandera o cuando el rival esta en tu base (lo mejor de las dos)
 *
 * El modo 2D opcional reutiliza el render original sobre otro canvas para
 * quien prefiera la vista clasica.
 */
(function () {
  "use strict";

  var THREE_ = window.THREE;
  var W = WORLD.W;
  var H = WORLD.H;
  var S = WORLD.MAP_SCALE;
  var U = MapUtils;

  var View = {
    mode: "tactical", // camara efectiva
    pref: "auto",
    quality: "high",
    zoom: 1,
    gfx: "3d",
    ready: false,
    camShake: true,
    // Rotacion libre de camara: se activa manteniendo el boton derecho y
    // moviendo el raton. "orbitLock" la deja fijada (toggle con L).
    orbitLock: false,
    orbiting: false,
    orbitYaw: 0,
    orbitPitch: 0,
    orbitDist: 1
  };

  var renderer = null;
  var scene = null;
  var camera = null;
  var canvas = null;
  var heroNodes = {};
  var flagNodes = {};
  var projNodes = [];
  var impactNodes = [];
  var sunLight = null;
  var tacticalPos = new THREE_.Vector3(0, 0, 0);
  var tacticalLook = new THREE_.Vector3(0, 0, 0);
  var camPos = new THREE_.Vector3();
  var camLook = new THREE_.Vector3();
  // vectores temporales reutilizados en updateCamera (sin new por frame)
  var _camTarget = new THREE_.Vector3();
  var _camLookTmp = new THREE_.Vector3();
  var _camEye = new THREE_.Vector3();
  var firstInit = false;
  var mouseX = 0;
  var mouseY = 0;
  var clockDir = new THREE_.Vector3();

  /** mundo -> three (centrado) */
  function wx(x) {
    return (x - W / 2) * S;
  }
  function wz(y) {
    return (y - H / 2) * S;
  }

  /* ------------------------------------------------------------------ *
   * Construccion de la escena
   * ------------------------------------------------------------------ */

  function disposeGroup(obj) {
    obj.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(function (m) { m.dispose(); });
        else child.material.dispose();
      }
    });
  }

  function clearGroup(group) {
    while (group.children.length) {
      var child = group.children.pop();
      group.remove(child);
      disposeGroup(child);
    }
  }

  function buildEnvironment(map) {
    var root = new THREE_.Group();
    root.name = "environment";

    // suelo
    var groundMat = new THREE_.MeshStandardMaterial({ color: map.ground, roughness: 0.92, metalness: 0.08 });
    var ground = new THREE_.Mesh(new THREE_.PlaneGeometry(W * S, H * S, 1, 1), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    // rejilla luminosa
    var grid = new THREE_.GridHelper(W * S, 30, map.accent, 0x22223a);
    grid.position.y = 0.012;
    grid.material.opacity = 0.16;
    grid.material.transparent = true;
    root.add(grid);

    // bordes del mapa
    var wallMat = new THREE_.MeshStandardMaterial({ color: 0x2c2c48, roughness: 0.6, metalness: 0.3, emissive: map.accent, emissiveIntensity: 0.12 });
    [
      { w: W * S + 0.6, d: 0.5, x: 0, z: -H * S / 2 - 0.25 },
      { w: W * S + 0.6, d: 0.5, x: 0, z: H * S / 2 + 0.25 },
      { w: 0.5, d: H * S + 0.6, x: -W * S / 2 - 0.25, z: 0 },
      { w: 0.5, d: H * S + 0.6, x: W * S / 2 + 0.25, z: 0 }
    ].forEach(function (b) {
      var mesh = new THREE_.Mesh(new THREE_.BoxGeometry(b.w, 1.1, b.d), wallMat);
      mesh.position.set(b.x, 0.55, b.z);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      root.add(mesh);
    });

    // bases (discos + aros de equipo)
    ["red", "blue"].forEach(function (team) {
      var cx = team === "red" ? 50 : W - 50;
      var color = team === "red" ? 0xff3366 : 0x4488ff;
      var pad = new THREE_.Mesh(
        new THREE_.CylinderGeometry(WORLD.BASE_RADIUS * S, WORLD.BASE_RADIUS * S, 0.06, 40),
        new THREE_.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.22, emissive: color, emissiveIntensity: 0.6 })
      );
      pad.position.set(wx(cx), 0.03, wz(H / 2));
      pad.receiveShadow = true;
      root.add(pad);

      var ringGeo = new THREE_.TorusGeometry(WORLD.BASE_RADIUS * S, 0.05, 8, 48);
      var ring = new THREE_.Mesh(ringGeo, new THREE_.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.4 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wx(cx), 0.09, wz(H / 2));
      root.add(ring);

      // portal de la base
      var portal = new THREE_.Mesh(
        new THREE_.TorusGeometry(0.55, 0.07, 10, 32, Math.PI),
        new THREE_.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.3 })
      );
      portal.position.set(wx(cx) + (team === "red" ? -0.35 : 0.35), 0.55, wz(H / 2));
      portal.rotation.y = team === "red" ? Math.PI / 2 : -Math.PI / 2;
      root.add(portal);
    });

    // obstaculos
    map.obstacles.forEach(function (o) {
      var h3 = (o.h3 || 24) * S;
      var color = o.color || 0x2b2b4d;
      var mesh;
      if (o.round) {
        mesh = new THREE_.Mesh(
          new THREE_.CylinderGeometry(o.r * S, o.r * S, h3, 24),
          new THREE_.MeshStandardMaterial({ color: color, roughness: 0.55, metalness: 0.35 })
        );
        mesh.position.set(wx(o.x + o.w / 2), h3 / 2, wz(o.y + o.h / 2));
      } else {
        mesh = new THREE_.Mesh(
          new THREE_.BoxGeometry(o.w * S, h3, o.h * S),
          new THREE_.MeshStandardMaterial({ color: color, roughness: 0.55, metalness: 0.35 })
        );
        mesh.position.set(wx(o.x + o.w / 2), h3 / 2, wz(o.y + o.h / 2));
      }
      mesh.castShadow = View.quality !== "low";
      mesh.receiveShadow = true;
      root.add(mesh);

      // borde luminoso
      var accent = map.accent;
      var edge;
      if (o.round) {
        edge = new THREE_.Mesh(
          new THREE_.TorusGeometry(o.r * S * 1.01, 0.02, 6, 24),
          new THREE_.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1 })
        );
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(wx(o.x + o.w / 2), h3 + 0.01, wz(o.y + o.h / 2));
      } else {
        edge = new THREE_.Mesh(
          new THREE_.BoxGeometry(o.w * S + 0.05, 0.05, o.h * S + 0.05),
          new THREE_.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1 })
        );
        edge.position.set(wx(o.x + o.w / 2), h3 + 0.02, wz(o.y + o.h / 2));
      }
      root.add(edge);
    });

    // decoracion: torretas/orbes flotantes para dar vida al mapa
    for (var i = 0; i < 10; i++) {
      var a = Game.rand() * Math.PI * 2;
      var rr = 2 + Game.rand() * 3;
      var ox = Math.cos(a) * rr;
      var oz = Math.sin(a) * rr;
      var orb = new THREE_.Mesh(
        new THREE_.OctahedronGeometry(0.09 + Game.rand() * 0.06, 0),
        new THREE_.MeshStandardMaterial({ color: map.accent, emissive: map.accent, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 })
      );
      orb.position.set(ox, 1.2 + Game.rand() * 0.9, oz);
      orb.userData.baseY = orb.position.y;
      orb.userData.speed = 0.5 + Game.rand() * 0.7;
      orb.userData.phase = Game.rand() * Math.PI * 2;
      root.add(orb);
    }

    return root;
  }

  function buildLighting() {
    var amb = new THREE_.AmbientLight(0x8899cc, 0.55);
    scene.add(amb);

    sunLight = new THREE_.DirectionalLight(0xfff2dd, 1.15);
    sunLight.position.set(6, 12, 8);
    if (View.quality !== "low") {
      sunLight.castShadow = true;
      // Mapa de sombras mas barato: 1024/768 en vez de 2048/1024. Con el
      // jugador siempre encuadrado se ve igual de bien y corre mucho mas fluido.
      sunLight.shadow.mapSize.width = View.quality === "high" ? 1024 : 768;
      sunLight.shadow.mapSize.height = View.quality === "high" ? 1024 : 768;
      var d = 7;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 40;
      sunLight.shadow.bias = -0.0008;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    var fill = new THREE_.HemisphereLight(0x88ccff, 0x202030, 0.5);
    scene.add(fill);

    // luces de equipo
    [["red", 0xff3355], ["blue", 0x3366ff]].forEach(function (pair) {
      var light = new THREE_.PointLight(pair[1], 1.4, 5.5, 2);
      var cx = pair[0] === "red" ? 50 : W - 50;
      light.position.set(wx(cx), 1.5, wz(H / 2));
      scene.add(light);
    });
    return sunLight;
  }

  function buildHeroNode(charId, team) {
    var ch = Models3D.getChar(charId);
    var built = Models3D.buildHero(ch);
    var group = built.group;
    group.userData.parts = built.parts;
    group.userData.char = ch;
    group.userData.height = built.group.userData.height || 1.4;

    // color de equipo: aro bajo los pies
    var teamColor = team === "red" ? 0xff3366 : 0x4488ff;
    var ring = new THREE_.Mesh(
      new THREE_.TorusGeometry(0.19 * built.scale, 0.035, 8, 24),
      new THREE_.MeshStandardMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 1.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    // nombre flotante (siempre por encima de la cabeza)
    var label = makeLabel(team === "red" ? "red" : "blue");
    label.position.y = group.userData.height + 0.22;
    group.add(label);
    group.userData.label = label;

    // escudo de energia (centrado en el cuerpo)
    var shield = new THREE_.Mesh(
      new THREE_.SphereGeometry(0.42 * built.scale, 18, 14),
      new THREE_.MeshStandardMaterial({
        color: 0x66ccff, emissive: 0x2288ff, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.22, side: THREE_.DoubleSide
      })
    );
    shield.visible = false;
    shield.position.y = 0.72 * built.scale;
    group.add(shield);
    group.userData.shield = shield;

    // aura de boost
    var aura = new THREE_.Mesh(
      new THREE_.ConeGeometry(0.34 * built.scale, 0.9, 12, 1, true),
      new THREE_.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.2, transparent: true, opacity: 0.28, side: THREE_.DoubleSide })
    );
    aura.position.y = 0.45 * built.scale;
    aura.visible = false;
    group.add(aura);
    group.userData.aura = aura;

    group.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = View.quality !== "low";
        child.receiveShadow = true;
      }
    });

    return group;
  }

  function makeLabel(team) {
    var canvasEl = document.createElement("canvas");
    canvasEl.width = 256;
    canvasEl.height = 64;
    var ctx = canvasEl.getContext("2d");
    ctx.font = "bold 34px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText("", 128, 32);
    var texture = new THREE_.CanvasTexture(canvasEl);
    texture.needsUpdate = true;
    var material = new THREE_.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    var sprite = new THREE_.Sprite(material);
    sprite.scale.set(1.3, 0.33, 1);
    sprite.userData.canvas = canvasEl;
    sprite.userData.texture = texture;
    return sprite;
  }

  function setLabel(sprite, text, color) {
    var canvasEl = sprite.userData.canvas;
    var ctx = canvasEl.getContext("2d");
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.font = "bold 34px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(text, 128, 32);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 32);
    sprite.userData.texture.needsUpdate = true;
  }

  function buildFlagNode(team) {
    var color = team === "red" ? 0xff3366 : 0x4488ff;
    var group = new THREE_.Group();

    var pole = new THREE_.Mesh(
      new THREE_.CylinderGeometry(0.025, 0.025, 1.1, 8),
      new THREE_.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.3 })
    );
    pole.position.y = 0.55;
    pole.castShadow = true;
    group.add(pole);

    var cloth = new THREE_.Mesh(
      new THREE_.PlaneGeometry(0.5, 0.34, 6, 3),
      new THREE_.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5, side: THREE_.DoubleSide })
    );
    cloth.position.set(0.26, 0.88, 0);
    cloth.castShadow = true;
    group.add(cloth);
    group.userData.cloth = cloth;

    var glyph = new THREE_.Mesh(
      new THREE_.TorusGeometry(0.1, 0.02, 6, 16),
      new THREE_.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 })
    );
    glyph.position.set(0.26, 0.88, 0.01);
    group.add(glyph);

    var ring = new THREE_.Mesh(
      new THREE_.TorusGeometry(0.3, 0.03, 8, 28),
      new THREE_.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.5 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);
    group.userData.ring = ring;

    return group;
  }

  function buildProjectileNode(team) {
    var color = team === "red" ? 0xff4466 : 0x44aaff;
    var group = new THREE_.Group();
    var core = new THREE_.Mesh(
      new THREE_.SphereGeometry(WORLD.SHOT_R * S * 1.1, 10, 8),
      new THREE_.MeshBasicMaterial({ color: color })
    );
    group.add(core);
    var halo = new THREE_.Mesh(
      new THREE_.SphereGeometry(WORLD.SHOT_R * S * 2.2, 10, 8),
      new THREE_.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.25 })
    );
    group.add(halo);
    var light = new THREE_.PointLight(color, 0.6, 2.2, 2);
    group.add(light);
    return group;
  }

  /* ------------------------------------------------------------------ *
   * Inicializacion / reconstruccion de mapa
   * ------------------------------------------------------------------ */

  View.init = function (canvasEl) {
    canvas = canvasEl;
    try {
      renderer = new THREE_.WebGLRenderer({
        canvas: canvasEl,
        antialias: View.quality !== "low",
        powerPreference: "high-performance"
      });
    } catch (e) {
      return false;
    }
    // Se limita la resolucion de pintado: en pantallas retina pintar a 2x
    // dispara el costo de GPU y provoca tirones. 1.25 es suficientemente nitido.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, View.quality === "high" ? 1.5 : 1.1));
    renderer.shadowMap.enabled = View.quality !== "low";
    // PCF (no "soft") es bastante mas barato y aqui las sombras son pequenas.
    renderer.shadowMap.type = THREE_.PCFShadowMap;
    if (THREE_.SRGBColorSpace) renderer.outputColorSpace = THREE_.SRGBColorSpace;

    scene = new THREE_.Scene();
    scene.background = new THREE_.Color(0x080812);
    scene.fog = new THREE_.Fog(0x080812, 12, 34);

    camera = new THREE_.PerspectiveCamera(50, 16 / 9, 0.1, 120);
    buildLighting();

    View.scene = scene;
    View.camera = camera;
    View.renderer = renderer;
    View.ready = true;
    View.buildMap();
    return true;
  };

  View.buildMap = function () {
    if (!View.ready) return;
    var old = scene.getObjectByName("environment");
    if (old) {
      scene.remove(old);
      disposeGroup(old);
    }
    scene.add(buildEnvironment(MapUtils.getMap(Game.mapId)));

    // heroes
    ["red", "blue"].forEach(function (team) {
      if (heroNodes[team]) {
        scene.remove(heroNodes[team]);
        disposeGroup(heroNodes[team]);
      }
      var node = buildHeroNode(Game.players[team].charId, team);
      node.userData.team = team;
      scene.add(node);
      heroNodes[team] = node;
      setLabel(node.userData.label, Game.players[team].name.toUpperCase().slice(0, 12), team === "red" ? "#ff88a0" : "#88bbff");
    });

    // banderas
    ["red", "blue"].forEach(function (team) {
      if (flagNodes[team]) {
        scene.remove(flagNodes[team]);
        disposeGroup(flagNodes[team]);
      }
      var flag = buildFlagNode(team);
      scene.add(flag);
      flagNodes[team] = flag;
    });

    // limpiar proyectiles previos
    projNodes.forEach(function (n) {
      scene.remove(n);
    });
    projNodes = [];

    View.updateTacticalCamera();
  };

  /** Reemplaza el modelo de un heroe (al cambiar de personaje). */
  View.rebuildHero = function (team) {
    if (!View.ready) return;
    var node = heroNodes[team];
    if (node) {
      scene.remove(node);
      disposeGroup(node);
    }
    var fresh = buildHeroNode(Game.players[team].charId, team);
    fresh.userData.team = team;
    scene.add(fresh);
    heroNodes[team] = fresh;
    setLabel(fresh.userData.label, Game.players[team].name.toUpperCase().slice(0, 12), team === "red" ? "#ff88a0" : "#88bbff");
  };

  /* ------------------------------------------------------------------ *
   * Camaras
   * ------------------------------------------------------------------ */

  View.updateTacticalCamera = function () {
    var zoom = View.zoom;
    var height = 8.4 / zoom;
    var depth = 6.4 / zoom;
    tacticalPos.set(0, height, depth);
    tacticalLook.set(0, 0.6, -0.4);
  };

  View.setPref = function (mode) {
    View.pref = mode;
    firstInit = false;
  };

  /** Activa/desactiva el bloqueo de rotacion (L o boton en pantalla). */
  View.setOrbitLock = function (on) {
    View.orbitLock = !!on;
    if (!View.orbitLock) View.orbiting = false;
    return View.orbitLock;
  };

  View.toggleOrbitLock = function () {
    return View.setOrbitLock(!View.orbitLock);
  };

  /** Gira la camara segun el movimiento del raton (arrastrando el boton der.). */
  /** Angulo horizontal real que esta usando la camara ahora mismo (rad).
   *  Sirve para que el movimiento del jugador use EXACTAMENTE la misma
   *  direccion que se ve en pantalla: asi al pulsar W el heroe no se
   *  "corra" de lado y la camara y el paso van siempre sincronizados. */
  View.getCamYaw = function () {
    if (View.mode !== "third") return null;
    var manual = View.orbitLock || View.orbiting;
    if (manual) return View.orbitYaw;
    return View.camYaw;
  };

  /** Girar con el boton derecho: parte desde el angulo actual (sin saltos). */
  View.beginOrbit = function () {
    if (View.camYaw !== undefined) View.orbitYaw = View.camYaw;
    View.orbiting = true;
    return View.orbiting;
  };

  View.orbitBy = function (dx, dy) {
    if (!View.orbitLock && !View.orbiting) return;
    View.orbitYaw -= dx * 0.006;
    View.orbitPitch = Math.max(-0.55, Math.min(0.85, View.orbitPitch + dy * 0.004));
  };

  /** Ajusta la distancia de orbita con la rueda del raton. */
  View.orbitZoomBy = function (dy) {
    View.orbitDist = Math.max(0.35, Math.min(3, View.orbitDist + dy * 0.0016));
    return View.orbitDist;
  };

  View.resetOrbit = function () {
    View.orbitYaw = 0;
    View.orbitPitch = 0;
    View.orbitDist = 1;
  };

  View.setZoom = function (z) {
    View.zoom = z;
    View.updateTacticalCamera();
  };

  View.setQuality = function (q, rendererRef, canvasEl) {
    View.quality = q;
    if (!View.ready) return;
    renderer.shadowMap.enabled = q !== "low";
    if (rendererRef && canvasEl && (q === "medium" || q === "low")) {
      renderer.setPixelRatio(q === "low" ? 1 : Math.min(window.devicePixelRatio || 1, 1.4));
    }
  };

  function desiredMode() {
    if (View.pref !== "auto") return View.pref;
    var me = Game.players[Game.localTeam];
    if (!me) return "third";
    // En "auto" se permanece casi siempre en 3a persona para que la camara
    // gire siguiendo al jugador (lo que pidio el usuario). Solo se sale a la
    // vista cenital al morir, para ver el mapa mientras se reaparece.
    if (me.respawn > 0) return "tactical";
    return "third";
  }

  /**
   * Modo estable: al caminar cerca de la bandera o del rival el modo "auto"
   * cambiaba de golpe y la camara daba saltos. Se exige mantener el modo
   * nuevo un instante antes de aplicarlo.
   */
  function stableMode(dt) {
    var want = desiredMode();
    if (View.pref !== "auto") {
      View.stableModeVal = want;
      View.modeSwitchT = 0;
      return want;
    }
    if (View.stableModeVal === undefined) {
      View.stableModeVal = want;
      View.modeSwitchT = 0;
      return want;
    }
    if (want !== View.stableModeVal) {
      View.modeSwitchT = (View.modeSwitchT || 0) + dt;
      if (View.modeSwitchT >= 1.1) {
        View.stableModeVal = want;
        View.modeSwitchT = 0;
      }
    } else {
      View.modeSwitchT = 0;
    }
    return View.stableModeVal;
  }

  View.updateCamera = function (dt) {
    var me = Game.players[Game.localTeam];
    if (!me) return;
    View.mode = stableMode(dt);
    var k = Math.min(1, dt * 5.5);

    // La rotacion libre tiene prioridad sobre el "auto".
    if (View.orbitLock) View.mode = View.pref === "first" ? "first" : "third";

    if (View.mode === "tactical") {
      View.updateTacticalCamera();
      camPos.lerp(tacticalPos, k);
      camLook.lerp(tacticalLook, k);
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(camLook);
    } else if (View.mode === "third") {
      var aim = me.aim || 0;
      var manual = View.orbitLock || View.orbiting;

      // Angulo de camara suavizado: al caminar la vista no gira de golpe
      // siguiendo cada pequeño movimiento del puntero.
      if (View.camYaw === undefined || manual || View.lastMode !== "third") {
        View.camYaw = aim;
      } else {
        var dAim = aim - View.camYaw;
        while (dAim > Math.PI) dAim -= Math.PI * 2;
        while (dAim < -Math.PI) dAim += Math.PI * 2;
        // Seguimiento preciso: la camara gira casi al mismo tiempo que el
        // raton (sin retardo visible) pero sin vibrar con micro-movimientos.
        View.camYaw += dAim * Math.min(1, dt * 10);
      }
      var camAng = manual ? View.orbitYaw : View.camYaw;

      var back = (1.85 / View.zoom) * View.orbitDist;
      var high = 1.05 / View.zoom;
      var pitch = View.orbitPitch;
      var behindX = wx(me.x) - Math.cos(camAng) * back * Math.cos(pitch);
      var behindZ = wz(me.y) - Math.sin(camAng) * back * Math.cos(pitch);

      // Altura estable: no sigue rebotes ni vibraciones del modelo.
      var targetY = high + Math.sin(pitch) * back;
      if (View.camY === undefined || View.lastMode !== "third") View.camY = targetY;
      View.camY += (targetY - View.camY) * Math.min(1, dt * 4);

      // Se reutilizan vectores (sin `new` por frame) para no generar basura
      // en el monton y evitar tirones de memoria.
      _camTarget.set(behindX, View.camY, behindZ);
      _camLookTmp.set(
        wx(me.x) + Math.cos(camAng) * 2.4,
        0.9,
        wz(me.y) + Math.sin(camAng) * 2.4
      );
      if (!firstInit) {
        camPos.copy(_camTarget);
        camLook.copy(_camLookTmp);
        firstInit = true;
      }
      // Seguimiento suave y firme: la camara acompana sin oscilar.
      camPos.lerp(_camTarget, Math.min(1, dt * 6.5));
      camLook.lerp(_camLookTmp, Math.min(1, dt * 7));
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(camLook);
    } else {
      _camEye.set(
        wx(me.x) + Math.cos(me.aim) * 0.18,
        1.12,
        wz(me.y) + Math.sin(me.aim) * 0.18
      );
      _camLookTmp.set(
        wx(me.x) + Math.cos(me.aim) * 4,
        0.9,
        wz(me.y) + Math.sin(me.aim) * 4
      );
      camera.position.copy(_camEye);
      camera.up.set(0, 1, 0);
      camera.lookAt(_camLookTmp);
    }

    // vibracion (mas suave para que no moleste al caminar)
    if (View.camShake && Game.shake > 0.01) {
      var s = Game.shake * 0.05;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      camera.position.z += (Math.random() - 0.5) * s;
    }

    // fuera de pantalla: ocultar al jugador local en primera persona
    var node = heroNodes[Game.localTeam];
    if (node) node.visible = !(View.mode === "first" && Game.players[Game.localTeam].respawn <= 0);
    View.lastMode = View.mode;
  };

  /** Direccion de apuntado a partir del raton (para tercera persona). */
  View.aimFromMouse = function (mx, my, width, height) {
    var me = Game.players[Game.localTeam];
    if (!me) return 0;
    if (View.mode === "tactical") {
      // el centro de la base del jugador, proyectado a pantalla
      var projected = new THREE_.Vector3(wx(me.x), 0.1, wz(me.y)).project(camera);
      var sx = (projected.x * 0.5 + 0.5) * width;
      var sy = (-projected.y * 0.5 + 0.5) * height;
      var dx = mx - sx;
      var dy = my - sy;
      if (dx * dx + dy * dy < 36) return me.aim;
      return Math.atan2(dy, dx);
    }
    return Math.atan2(my - height / 2, mx - width / 2);
  };

  /* ------------------------------------------------------------------ *
   * Update por frame
   * ------------------------------------------------------------------ */

  /** Estado de animacion por personaje (persiste entre frames). */
  function animState(node) {
    if (!node.userData.anim) {
      node.userData.anim = {
        recoil: 0,
        dash: 0,
        lastShootAt: -1,
        lastDashAt: -1,
        walkPhase: 0,
        bob: 0
      };
    }
    return node.userData.anim;
  }

  /** Escanea los eventos del juego para disparos y embestidas. */
  function scanCombatEvents() {
    var evs = Game.events;
    if (!evs || !evs.length) return;
    ["red", "blue"].forEach(function (team) {
      var node = heroNodes[team];
      if (!node) return;
      var st = animState(node);
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i];
        if (e.team !== team) continue;
        if (e.type === "shoot" && e.at > st.lastShootAt) {
          st.lastShootAt = e.at;
          st.recoil = 1;
        } else if (e.type === "dash" && e.at > st.lastDashAt) {
          st.lastDashAt = e.at;
          st.dash = 1;
        } else if (e.type === "ability" && e.kind === "dash" && e.at > st.lastDashAt) {
          st.lastDashAt = e.at;
          st.dash = 1;
        }
      }
    });
  }

  function animateHero(team, dt) {
    var node = heroNodes[team];
    if (!node) return;
    var p = Game.players[team];
    var parts = node.userData.parts;
    var dead = p.respawn > 0 || p.x < -100;
    var st = animState(node);

    node.visible = !dead && !(View.mode === "first" && team === Game.localTeam && p.respawn <= 0);
    if (dead) return;

    // ---- orientacion: al andar mira hacia donde camina; quieto mira el
    // raton. Asi el personaje nunca se "corre" de lado al avanzar. ----
    node.position.set(wx(p.x), 0, wz(p.y));
    var speedNow = Math.hypot(p.vx, p.vy);
    var targetAngle;
    if (speedNow > 14) {
      targetAngle = Math.atan2(p.facingY, p.facingX);
    } else {
      targetAngle = p.aim !== undefined ? p.aim : Math.atan2(p.facingY, p.facingX);
    }
    var target = Math.PI / 2 - targetAngle; // el modelo mira hacia +Z
    var current = node.rotation.y;
    var diff = wrapAngle(target - current);
    node.rotation.y = current + diff * Math.min(1, dt * 14);

    // ---- velocidad y fase de marcha ----
    var speed = Math.hypot(p.vx, p.vy);
    var speedFactor = Math.min(1.6, speed / 190);
    var moving = speed > 12;
    var running = speed > 210;
    st.walkPhase += dt * (running ? 15 : 10) * (0.5 + speedFactor * 0.6);

    // ---- retroceso del disparo y embestida ----
    st.recoil = Math.max(0, st.recoil - dt * 5.5);
    st.dash = Math.max(0, st.dash - dt * 2.2);

    if (parts) {
      var s = moving ? Math.sin(st.walkPhase) : 0;
      var big = (node.userData.char && node.userData.char.big) || 1;
      var legAmp = 0.6 + speedFactor * 0.25;
      var armAmp = 0.5 + speedFactor * 0.2;

      // --- piernas (cadera + rodilla) ---
      parts.legL.rotation.x = s * legAmp;
      parts.legR.rotation.x = -s * legAmp;
      if (parts.kneeL) parts.kneeL.rotation.x = 0.16 + Math.max(0, s) * 0.5;
      if (parts.kneeR) parts.kneeR.rotation.x = 0.16 + Math.max(0, -s) * 0.5;

      // --- brazo izquierdo (balanceo natural) ---
      parts.armL.rotation.x = -s * armAmp - 0.12;
      if (parts.elbowL) parts.elbowL.rotation.x = -0.4 - Math.max(0, s) * 0.35;

      // --- brazo derecho (apuntando con el arma) ---
      var aimArm = -1.32 + st.recoil * 0.45;
      parts.armR.rotation.x = aimArm;
      if (parts.elbowR) parts.elbowR.rotation.x = -0.18 + st.recoil * 0.5;

      // --- torso: inclinacion al correr + balanceo + respiracion ---
      if (parts.torso) {
        var lean = running ? 0.16 : (moving ? 0.08 : 0);
        parts.torso.rotation.x = lean + st.recoil * 0.06;
        parts.torso.rotation.z = s * 0.05;
        var baseTorsoY = 0.66 * big;
        var bobY = moving ? Math.abs(Math.sin(st.walkPhase)) * 0.028 : Math.sin(Game.time * 2.2 + (team === "red" ? 0 : 1.7)) * 0.008;
        parts.torso.position.y = baseTorsoY + bobY - st.recoil * 0.015;
      }
      if (parts.hips) {
        parts.hips.rotation.y = -s * 0.08;
      }

      // --- cabeza: sigue el giro del cuerpo ---
      if (parts.head) {
        parts.head.rotation.y = -diff * 0.3;
        parts.head.rotation.x = moving ? -lean * 0.4 : Math.sin(Game.time * 1.6) * 0.02;
      }

      // --- capa: ondea con el movimiento ---
      if (parts.cape) {
        parts.cape.rotation.x = -0.1 - Math.min(0.55, speed / 520);
        parts.cape.rotation.z = Math.sin(Game.time * 3 + st.walkPhase * 0.3) * 0.06;
      }

      // --- nucleo luminoso ---
      if (parts.core) {
        var pulse = 1 + Math.sin(Game.time * 6) * 0.07 + st.recoil * 0.25;
        parts.core.scale.set(pulse, pulse, pulse);
      }
      // --- gema de Vision ---
      if (parts.gem) {
        var gp = 1 + Math.sin(Game.time * 4) * 0.15;
        parts.gem.scale.set(gp, gp, gp);
      }

      // --- arma: efectos segun personaje ---
      if (parts.weapon && parts.weapon.userData) {
        var ud = parts.weapon.userData;
        if (ud.spell) {
          ud.spell.rotation.z += dt * 2.4;
          ud.spell2.rotation.z -= dt * 3.2;
          var sp = 1 + Math.sin(Game.time * 5) * 0.12;
          ud.spell.scale.set(sp, sp, 1);
        }
        if (ud.orb) {
          var op = 1 + Math.sin(Game.time * 7) * 0.2 + st.recoil * 0.4;
          ud.orb.scale.set(op, op, op);
          ud.orb.position.y = -0.28 * (node.userData.char.big || 1) + Math.sin(Game.time * 3) * 0.02;
        }
        if (ud.repulsor) {
          var rp = 1 + Math.sin(Game.time * 8) * 0.12 + st.recoil * 0.6;
          ud.repulsor.scale.set(rp, rp, rp);
        }
      }

      // --- cola de Rocket ---
      if (parts.tail) {
        parts.tail.rotation.x = 0.9 + Math.sin(Game.time * 4) * 0.15;
        parts.tail.rotation.z = Math.sin(Game.time * 3) * 0.12;
      }

      // --- embestida (clase agil): tuck y adelantarse ---
      if (st.dash > 0) {
        var d = st.dash;
        parts.legL.rotation.x = -0.9 * d;
        parts.legR.rotation.x = -0.6 * d;
        if (parts.kneeL) parts.kneeL.rotation.x = 0.16 + 1.3 * d;
        if (parts.kneeR) parts.kneeR.rotation.x = 0.16 + 1.0 * d;
        parts.armL.rotation.x = -1.5 * d;
        parts.armR.rotation.x = -1.6 * d;
        if (parts.torso) parts.torso.rotation.x = 0.35 * d;
        node.position.y = Math.sin(st.dash * Math.PI) * 0.12;
      }
    }

    // escudo
    var shield = node.userData.shield;
    if (shield) {
      shield.visible = p.powers.shield.duration > 0;
      if (shield.visible) {
        shield.rotation.y += dt * 1.6;
        shield.material.opacity = 0.16 + Math.sin(Game.time * 8) * 0.06 + 0.1;
      }
    }
    // aura de boost
    var aura = node.userData.aura;
    if (aura) {
      aura.visible = p.powers.boost.duration > 0;
      if (aura.visible) aura.rotation.y += dt * 5;
    }
    // aturdido / muerto
    if (p.stunned > 0) {
      node.rotation.z = Math.sin(Game.time * 22) * 0.08;
    } else {
      node.rotation.z = 0;
    }

    if (Game.localTeam !== team && View.mode !== "first") {
      node.userData.label.visible = true;
    }
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function animateFlags(dt) {
    ["red", "blue"].forEach(function (team) {
      var f = Game.flags[team];
      var node = flagNodes[team];
      if (!node) return;
      if (f.carrier) {
        node.visible = true;
        var carrier = Game.players[f.carrier];
        if (carrier.respawn > 0) {
          node.visible = false;
          return;
        }
        node.position.set(wx(carrier.x), 1.35, wz(carrier.y));
        node.rotation.y = Math.PI / 2 - carrier.aim;
      } else {
        node.visible = true;
        node.position.set(wx(f.x), 0.02 + Math.sin(f.bob) * 0.04, wz(f.y));
        node.rotation.y = team === "red" ? -Math.PI / 2 : Math.PI / 2;
      }
      if (node.userData.ring) {
        node.userData.ring.rotation.z += dt * (team === "red" ? 1.2 : -1.2);
        node.userData.ring.material.emissiveIntensity = 1 + Math.sin(f.bob * 2) * 0.4;
      }
      if (node.userData.cloth) {
        node.userData.cloth.rotation.y = Math.sin(f.bob * 1.5) * 0.25;
      }
    });
  }

  function animateProjectiles() {
    var list = Game.projectiles;
    while (projNodes.length < list.length) {
      var extra = buildProjectileNode(list[projNodes.length].team);
      scene.add(extra);
      projNodes.push(extra);
    }
    while (projNodes.length > list.length) {
      var dead = projNodes.pop();
      scene.remove(dead);
      disposeGroup(dead);
    }
    for (var i = 0; i < list.length; i++) {
      var pr = list[i];
      var node = projNodes[i];
      node.position.set(wx(pr.x), 0.42, wz(pr.y));
      node.visible = true;
    }
    // proyectiles remotos (invitado)
    if (Game.remoteProjectiles && Game.remoteProjectiles.length) {
      // se dibujan como parte de la lista local en el modo invitado
    }
  }

  function animateEffects(dt) {
    while (impactNodes.length < Game.effects.length) {
      var halo = new THREE_.Mesh(
        new THREE_.RingGeometry(0.1, 0.4, 20),
        new THREE_.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE_.DoubleSide })
      );
      halo.rotation.x = -Math.PI / 2;
      scene.add(halo);
      impactNodes.push(halo);
    }
    while (impactNodes.length > Game.effects.length) {
      var dead = impactNodes.pop();
      scene.remove(dead);
      disposeGroup(dead);
    }
    for (var i = 0; i < Game.effects.length; i++) {
      var e = Game.effects[i];
      var node = impactNodes[i];
      var t = e.t / e.life;
      node.position.set(wx(e.x), 0.12 + t * 0.5, wz(e.y));
      node.scale.setScalar(0.6 + t * 2.4);
      node.material.opacity = Math.max(0, 0.85 * (1 - t));
      node.material.color.setHex(e.team === "red" ? 0xff6688 : 0x66aaff);
    }
  }

  function animateOrbs() {
    var env = scene.getObjectByName("environment");
    if (!env) return;
    env.children.forEach(function (child) {
      if (child.userData && child.userData.baseY !== undefined) {
        child.position.y = child.userData.baseY + Math.sin(Game.time * child.userData.speed + child.userData.phase) * 0.22;
        child.rotation.y += 0.01;
        child.rotation.x += 0.006;
      }
    });
  }

  View.render = function (dt) {
    if (!View.ready) return;
    scanCombatEvents();
    animateHero("red", dt);
    animateHero("blue", dt);
    animateFlags(dt);
    animateProjectiles();
    animateEffects(dt);
    animateOrbs();
    View.updateCamera(dt);

    if (sunLight && View.mode !== "tactical") {
      // sigue al jugador local para que la sombra siempre sea nitida
      var me = Game.players[Game.localTeam];
      sunLight.position.set(wx(me.x) + 6, 12, wz(me.y) + 8);
      sunLight.target.position.set(wx(me.x), 0, wz(me.y));
      if (!sunLight.target.parent) scene.add(sunLight.target);
    } else if (sunLight) {
      sunLight.position.set(6, 12, 8);
      sunLight.target.position.set(0, 0, 0);
      if (!sunLight.target.parent) scene.add(sunLight.target);
    }

    renderer.render(scene, camera);
  };

  View.resize = function () {
    if (!View.ready) return;
    var parent = canvas.parentElement;
    var w = parent.clientWidth;
    var h = parent.clientHeight;
    if (w <= 0 || h <= 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  View.rebuildAll = function () {
    if (!View.ready) return;
    View.buildMap();
  };

  View.setGfx = function (mode) {
    View.gfx = mode;
  };

  window.View3D = View;
})();
