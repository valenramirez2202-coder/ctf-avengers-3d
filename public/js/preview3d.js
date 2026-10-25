/**
 * Vista previa 3D del personaje con sus accesorios en el menu.
 *
 * Es un renderizador aparte del del juego (contexto WebGL propio) para no
 * tocar nada de View3D. Si el navegador no da un segundo contexto o no tiene
 * WebGL, simplemente no se muestra y el juego sigue funcionando.
 */
(function () {
  "use strict";

  var renderer = null;
  var scene = null;
  var cam = null;
  var node = null;
  var canvas = null;
  var running = false;
  var last = 0;
  var charId = null;
  var acc = null;
  var ok = false;

  function disposeNode(obj) {
    if (!obj) return;
    obj.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(function (m) { m.dispose(); });
        } else {
          child.material.dispose();
        }
      }
    });
    if (obj.parent) obj.parent.remove(obj);
  }

  function init(cv) {
    if (ok) return true;
    if (typeof THREE === "undefined") return false;
    canvas = cv;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    } catch (e) {
      return false;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    cam.position.set(0, 1.15, 3.5);
    cam.lookAt(0, 0.85, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3550, 1.0));
    var key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.4, 4, 3);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0x88bbff, 0.5);
    fill.position.set(-3, 1.5, -2);
    scene.add(fill);

    // suelo discreto para que la figura no "flote"
    var floor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.05, 40),
      new THREE.MeshStandardMaterial({ color: 0x141a33, roughness: 0.9, metalness: 0.1 })
    );
    floor.position.y = -0.03;
    scene.add(floor);
    var halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.02, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.2 })
    );
    halo.rotation.x = Math.PI / 2;
    scene.add(halo);

    ok = true;
    resize();
    return true;
  }

  function resize() {
    if (!ok || !canvas) return;
    var w = canvas.clientWidth || canvas.width || 300;
    var h = canvas.clientHeight || canvas.height || 340;
    if (w < 8 || h < 8) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }

  function rebuild() {
    if (!ok || !window.Models3D || !charId) return;
    disposeNode(node);
    var built;
    try {
      built = Models3D.buildHero(Models3D.getChar(charId), acc || {});
    } catch (e) {
      node = null;
      return;
    }
    node = built.group;
    node.userData = node.userData || {};
    node.userData.parts = built.parts;
    node.rotation.y = -0.5;
    scene.add(node);
  }

  function set(nextChar, nextAcc) {
    var changed = nextChar !== charId || JSON.stringify(nextAcc || {}) !== JSON.stringify(acc || {});
    charId = nextChar;
    acc = nextAcc || {};
    if (changed) rebuild();
  }

  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    if (node) {
      node.rotation.y += dt * 0.55;
      node.position.y = Math.sin(now * 0.0022) * 0.03;
      if (node.userData && node.userData.parts) {
        var p = node.userData.parts;
        if (p.armL) p.armL.rotation.x = Math.sin(now * 0.003) * 0.16 - 0.08;
        if (p.armR) p.armR.rotation.x = -Math.sin(now * 0.003) * 0.16 - 0.05;
        if (p.cape) p.cape.rotation.x = -0.12 - Math.abs(Math.sin(now * 0.0025)) * 0.16;
      }
    }
    renderer.render(scene, cam);
  }

  window.Preview3D = {
    init: function (cv) {
      return init(cv);
    },
    resize: resize,
    set: set,
    start: function () {
      if (!ok || running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    },
    stop: function () {
      running = false;
    },
    isReady: function () {
      return ok;
    }
  };
})();
