/**
 * Efectos de sonido sintetizados (sin archivos externos).
 * Todo se genera con la Web Audio API, asi el juego es autocontenido.
 */
(function () {
  "use strict";

  var ctx = null;
  var master = null;
  var volume = 0.7;
  var enabled = true;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      enabled = false;
      return null;
    }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    return ctx;
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = volume;
  }

  function getVolume() {
    return volume;
  }

  /** Tono simple con envolvente. */
  function tone(opts) {
    if (!enabled) return;
    var c = ensure();
    if (!c) return;
    resume();
    var now = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = opts.type || "square";
    osc.frequency.setValueAtTime(opts.freq || 440, now);
    if (opts.freqTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqTo), now + (opts.dur || 0.15));
    var peak = (opts.gain === undefined ? 0.25 : opts.gain);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (opts.dur || 0.15));
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + (opts.dur || 0.15) + 0.02);
  }

  /** Ruido filtrado (impactos, explosiones). */
  function noise(opts) {
    if (!enabled) return;
    var c = ensure();
    if (!c) return;
    resume();
    var dur = opts.dur || 0.25;
    var frames = Math.floor(c.sampleRate * dur);
    var buffer = c.createBuffer(1, frames, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    var src = c.createBufferSource();
    src.buffer = buffer;
    var filter = c.createBiquadFilter();
    filter.type = opts.filter || "lowpass";
    filter.frequency.setValueAtTime(opts.freq || 1200, c.currentTime);
    if (opts.freqTo) filter.frequency.exponentialRampToValueAtTime(Math.max(30, opts.freqTo), c.currentTime + dur);
    var gain = c.createGain();
    gain.gain.setValueAtTime(opts.gain === undefined ? 0.3 : opts.gain, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  var SFX = {
    shoot: function () {
      tone({ freq: 880, freqTo: 180, dur: 0.12, type: "sawtooth", gain: 0.14 });
      noise({ dur: 0.08, freq: 2600, gain: 0.1, filter: "highpass" });
    },
    boost: function () {
      tone({ freq: 220, freqTo: 900, dur: 0.35, type: "sine", gain: 0.18 });
    },
    shield: function () {
      tone({ freq: 300, freqTo: 620, dur: 0.4, type: "triangle", gain: 0.16 });
      tone({ freq: 620, freqTo: 300, dur: 0.4, type: "sine", gain: 0.1, delay: 0.15 });
    },
    hit: function () {
      noise({ dur: 0.3, freq: 900, freqTo: 90, gain: 0.4 });
      tone({ freq: 160, freqTo: 50, dur: 0.3, type: "square", gain: 0.16 });
    },
    blocked: function () {
      tone({ freq: 1400, freqTo: 900, dur: 0.12, type: "square", gain: 0.12 });
    },
    pickup: function () {
      tone({ freq: 520, dur: 0.1, type: "sine", gain: 0.2 });
      tone({ freq: 780, dur: 0.14, type: "sine", gain: 0.18, delay: 0.08 });
    },
    score: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.22, delay: i * 0.1 });
      });
    },
    win: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) {
        tone({ freq: f, dur: 0.35, type: "square", gain: 0.2, delay: i * 0.14 });
      });
    },
    lose: function () {
      [440, 392, 330, 262].forEach(function (f, i) {
        tone({ freq: f, dur: 0.34, type: "sawtooth", gain: 0.18, delay: i * 0.16 });
      });
    },
    beep: function () {
      tone({ freq: 660, dur: 0.08, type: "square", gain: 0.14 });
    },
    power: function () {
      tone({ freq: 180, freqTo: 1400, dur: 0.5, type: "sawtooth", gain: 0.2 });
      noise({ dur: 0.4, freq: 400, freqTo: 3000, gain: 0.18, filter: "highpass" });
    },
    dash: function () {
      noise({ dur: 0.35, freq: 2400, freqTo: 300, gain: 0.22, filter: "highpass" });
    },
    freeze: function () {
      tone({ freq: 1200, freqTo: 300, dur: 0.6, type: "sine", gain: 0.2 });
    },
    teleport: function () {
      tone({ freq: 400, freqTo: 1600, dur: 0.25, type: "sine", gain: 0.18 });
      tone({ freq: 1600, freqTo: 400, dur: 0.3, type: "sine", gain: 0.12, delay: 0.2 });
    },
    countdown: function () {
      tone({ freq: 880, dur: 0.14, type: "square", gain: 0.16 });
    },
    explode: function () {
      noise({ dur: 0.8, freq: 700, freqTo: 60, gain: 0.5 });
    }
  };

  window.SFX = Object.assign(SFX, {
    setVolume: setVolume,
    getVolume: getVolume,
    resume: resume,
    unlock: ensure,
    isEnabled: function () {
      return enabled;
    }
  });
})();
