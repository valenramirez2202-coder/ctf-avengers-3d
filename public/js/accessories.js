/**
 * Accesorios: sombreros, capas/ruanas, ropa chistosa y accesorios de cara.
 *
 * TODO es GRATIS y se desbloquea desde el minuto cero: no hay precios, ni
 * monedas, ni niveles. Solo se elige y se guarda en el navegador.
 *
 * Este archivo solo guarda DATOS y utilidades de UI. La geometria 3D de cada
 * accesorio se construye en models3d.js (alli estan las primitivas THREE).
 */
(function () {
  "use strict";

  var CATS = [
    { id: "hat", name: "Sombreros", emoji: "🎩", hint: "Gorros, cascos y coronas" },
    { id: "cape", name: "Capas y Ruanas", emoji: "🧣", hint: "Capas, ponchos y ruanas" },
    { id: "outfit", name: "Ropa chistosa", emoji: "🤪", hint: "Disfraces y trajes graciosos" },
    { id: "face", name: "Cara", emoji: "😎", hint: "Gafas, bigotes y caretas" }
  ];

  /**
   * Cada accesorio:
   *   id    -> unico en TODA la lista (se usa como clave de construccion 3D)
   *   cat   -> hat | cape | outfit | face
   *   name  -> como se muestra en la tienda
   *   emoji -> icono de la ficha
   *   desc  -> texto corto de ayuda
   *   color -> color base (para la ficha y a veces para la geometria)
   *   suitColor / trimColor -> (solo outfit) recolorean el traje del heroe
   *   extra / shape        -> variante que usa models3d.js
   */
  var LIST = [
    /* ---------------- SOMBREROS ---------------- */
    { id: "hat_tophat", cat: "hat", name: "Chistera", emoji: "🎩", desc: "Elegancia de gala", color: 0x1a1a22, shape: "tophat" },
    { id: "hat_party", cat: "hat", name: "Gorro de fiesta", emoji: "🎉", desc: "Para celebrar el punto", color: 0xff4d94, shape: "party" },
    { id: "hat_panama", cat: "hat", name: "Sombrero de playa", emoji: "🏖️", desc: "Ala ancha y fresquita", color: 0xe8c87a, shape: "panama" },
    { id: "hat_crown", cat: "hat", name: "Corona real", emoji: "👑", desc: "Rey o reina del mapa", color: 0xffd700, shape: "crown" },
    { id: "hat_viking", cat: "hat", name: "Casco vikingo", emoji: "⚔️", desc: "Con cuernos", color: 0x9aa2b0, shape: "viking" },
    { id: "hat_cowboy", cat: "hat", name: "Sombrero vaquero", emoji: "🤠", desc: "Bien plantado", color: 0x7a4a22, shape: "cowboy" },
    { id: "hat_witch", cat: "hat", name: "Sombrero de bruja", emoji: "🧙", desc: "Punta torcida", color: 0x241a3a, shape: "witch" },
    { id: "hat_chef", cat: "hat", name: "Gorro de chef", emoji: "👨‍🍳", desc: "Cocinero de la victoria", color: 0xf6f6f6, shape: "chef" },
    { id: "hat_beanie", cat: "hat", name: "Gorro de lana", emoji: "🧢", desc: "Con pompón", color: 0x2f6fd0, shape: "beanie" },
    { id: "hat_headphones", cat: "hat", name: "Audífonos", emoji: "🎧", desc: "Modo playlist", color: 0x22222c, shape: "headphones" },
    { id: "hat_ears", cat: "hat", name: "Orejas de conejo", emoji: "🐰", desc: "Muy peludas", color: 0xfff0f4, shape: "ears" },
    { id: "hat_horns", cat: "hat", name: "Cuernos de demonio", emoji: "😈", desc: "Mala leche", color: 0x301018, shape: "horns" },
    { id: "hat_racer", cat: "hat", name: "Casco de carreras", emoji: "🏎️", desc: "Visor abajo", color: 0xdd2233, shape: "racer" },
    { id: "hat_mariachi", cat: "hat", name: "Sombrero mariachi", emoji: "🌵", desc: "Ala gigante", color: 0x3b2a18, shape: "mariachi" },
    { id: "hat_flower", cat: "hat", name: "Corona de flores", emoji: "🌸", desc: "Primaveral", color: 0xff8fbf, shape: "flower" },

    /* ---------------- CAPAS Y RUANAS ---------------- */
    { id: "cape_hero", cat: "cape", name: "Capa de héroe", emoji: "🦸", desc: "La clásica que ondea", color: 0xd02030, shape: "long" },
    { id: "cape_ruana", cat: "cape", name: "Ruana tejida", emoji: "🧣", desc: "Ancha, corta y abrigada", color: 0xb45f3a, shape: "ruana" },
    { id: "cape_poncho", cat: "cape", name: "Poncho de playa", emoji: "🏖️", desc: "Franjas coloridas", color: 0x2fbf9f, shape: "stripe" },
    { id: "cape_hood", cat: "cape", name: "Capucha misteriosa", emoji: "🧥", desc: "Oscura y misteriosa", color: 0x2a2a3a, shape: "hood" },
    { id: "cape_royal", cat: "cape", name: "Manta real", emoji: "👑", desc: "Terciopelo y pelaje", color: 0x7a1436, shape: "royal" },
    { id: "cape_bat", cat: "cape", name: "Alas de murciélago", emoji: "🦇", desc: "Se abren al correr", color: 0x18101f, shape: "wings" },
    { id: "cape_rainbow", cat: "cape", name: "Capa arcoíris", emoji: "🌈", desc: "Todos los colores", color: 0xff5555, shape: "rainbow" },
    { id: "cape_towel", cat: "cape", name: "Toalla de playa", emoji: "🛀", desc: "Post-partido", color: 0xffffff, shape: "towel" },
    { id: "cape_flag", cat: "cape", name: "Capa bandera", emoji: "🏁", desc: "Lleva el equipo a cuestas", color: 0x2244cc, shape: "flag" },

    /* ---------------- ROPA CHISTOSA ---------------- */
    { id: "out_chicken", cat: "outfit", name: "Disfraz de pollo", emoji: "🐔", desc: "Plumas y patas amarillas", color: 0xfff4e6, suitColor: 0xfff4e6, trimColor: 0xf6a71a, extra: "collar" },
    { id: "out_clown", cat: "outfit", name: "Traje de payaso", emoji: "🤡", desc: "Lunares y volantes", color: 0xff7ad9, suitColor: 0xff7ad9, trimColor: 0x22d3ee, extra: "buttons" },
    { id: "out_dino", cat: "outfit", name: "Traje de dinosaurio", emoji: "🦕", desc: "Dorsales y cola", color: 0x3fa34d, suitColor: 0x3fa34d, trimColor: 0x9be15d, extra: "spikes" },
    { id: "out_pyjama", cat: "outfit", name: "Pijama rayado", emoji: "😴", desc: "Modo siesta", color: 0x9fd0ff, suitColor: 0x9fd0ff, trimColor: 0xffffff, extra: "stripes" },
    { id: "out_banana", cat: "outfit", name: "Traje de plátano", emoji: "🍌", desc: "Potasio +10", color: 0xffe14d, suitColor: 0xffe14d, trimColor: 0x6b4a12, extra: "tail" },
    { id: "out_prisoner", cat: "outfit", name: "Mono de presidiario", emoji: "🚔", desc: "Rayas blancas y negras", color: 0xf2f2f2, suitColor: 0xf2f2f2, trimColor: 0x1c1c1c, extra: "stripes" },
    { id: "out_rainbow", cat: "outfit", name: "Traje arcoíris", emoji: "🌈", desc: "Brilla desde lejos", color: 0xff3b6b, suitColor: 0xffffff, trimColor: 0xff3b6b, extra: "rainbow" },
    { id: "out_suit", cat: "outfit", name: "Traje y corbata", emoji: "🤵", desc: "Reunión de directivos", color: 0x23232e, suitColor: 0x23232e, trimColor: 0xf2f2f2, extra: "tie" },
    { id: "out_sumo", cat: "outfit", name: "Traje de sumo", emoji: "🏋️", desc: "Mucho aire en la armadura", color: 0xffffff, suitColor: 0xffffff, trimColor: 0xdd2244, extra: "beltbig" },
    { id: "out_pony", cat: "outfit", name: "Traje de unicornio", emoji: "🦄", desc: "Con cuerno y colita", color: 0xf7d9ff, suitColor: 0xf7d9ff, trimColor: 0xa86bff, extra: "horn" },

    /* ---------------- CARA ---------------- */
    { id: "face_shades", cat: "face", name: "Gafas de sol", emoji: "😎", desc: "Nunca se quitan", color: 0x101014, shape: "shades" },
    { id: "face_nerd", cat: "face", name: "Anteojos de nerd", emoji: "🤓", desc: "Lentes redondos", color: 0x2a2a2a, shape: "nerd" },
    { id: "face_mustache", cat: "face", name: "Bigote tupido", emoji: "🥸", desc: "Disfraz de incógnito", color: 0x241a12, shape: "mustache" },
    { id: "face_disguise", cat: "face", name: "Disfraz completo", emoji: "🕵️", desc: "Gafas + bigote + nariz", color: 0x3a2a1a, shape: "disguise" },
    { id: "face_clownnose", cat: "face", name: "Nariz de payaso", emoji: "🤡", desc: "Boop", color: 0xff2244, shape: "clownnose" },
    { id: "face_santa", cat: "face", name: "Barba de Papá Noel", emoji: "🎅", desc: "Temporada navideña", color: 0xfafafa, shape: "santa" },
    { id: "face_mask", cat: "face", name: "Careta de héroe", emoji: "🦹", desc: "Banda en los ojos", color: 0x2b6cff, shape: "mask" },
    { id: "face_cat", cat: "face", name: "Bigotes de gato", emoji: "🐱", desc: "Con nariz rosada", color: 0xffb6c9, shape: "cat" },
    { id: "face_beak", cat: "face", name: "Pico de pollo", emoji: "🐤", desc: "Combo con el traje", color: 0xf6a71a, shape: "beak" }
  ];

  var byId = {};
  var byCat = {};
  CATS.forEach(function (c) {
    byCat[c.id] = [];
  });
  LIST.forEach(function (a) {
    byId[a.id] = a;
    if (byCat[a.cat]) byCat[a.cat].push(a);
  });

  var SLOTS = ["hat", "cape", "outfit", "face"];
  var STORE_KEY = "ctf3d.acc";

  function blank() {
    return { hat: null, cape: null, outfit: null, face: null };
  }

  function normalize(raw) {
    var out = blank();
    if (!raw || typeof raw !== "object") return out;
    SLOTS.forEach(function (slot) {
      var id = raw[slot];
      if (typeof id === "string" && byId[id] && byId[id].cat === slot) out[slot] = id;
    });
    return out;
  }

  var current = blank();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      current = raw ? normalize(JSON.parse(raw)) : blank();
    } catch (e) {
      current = blank();
    }
    return current;
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(current));
    } catch (e) {
      /* modo privado: seguimos jugando sin guardar */
    }
  }

  var Acc = {
    CATS: CATS,
    LIST: LIST,

    load: load,
    /** Devuelve una copia del equipamiento actual (nunca la referencia viva). */
    equipped: function () {
      return normalize(current);
    },
    get: function (slot) {
      return current[slot] || null;
    },
    byId: function (id) {
      return byId[id] || null;
    },
    list: function (cat) {
      return byCat[cat] || [];
    },
    /** Guarda (o quita con null/""/"none") un accesorio. */
    set: function (slot, id) {
      if (SLOTS.indexOf(slot) < 0) return false;
      if (!id || id === "none" || id === "") {
        current[slot] = null;
      } else {
        var def = byId[id];
        if (!def || def.cat !== slot) return false;
        current[slot] = id;
      }
      save();
      return true;
    },
    clear: function () {
      current = blank();
      save();
    },
    /** Línea de emoji con todo lo equipado (para tooltips y la ficha). */
    emojiLine: function (acc) {
      var a = normalize(acc || current);
      var out = "";
      SLOTS.forEach(function (slot) {
        var def = a[slot] ? byId[a[slot]] : null;
        if (def) out += def.emoji;
      });
      return out;
    },
    /** Equipamiento aleatorio (para el bot y los rivales). */
    random: function (chance) {
      var acc = blank();
      var p = chance === undefined ? 0.6 : chance;
      SLOTS.forEach(function (slot) {
        if (Math.random() < p) {
          var items = byCat[slot];
          acc[slot] = items[Math.floor(Math.random() * items.length)].id;
        }
      });
      return acc;
    },
    sanitize: normalize
  };

  window.ACCESSORY_CATS = CATS;
  window.ACCESSORIES = LIST;
  window.Acc = Acc;
})();
