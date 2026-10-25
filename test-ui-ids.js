const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "public");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ui = fs.readFileSync(path.join(root, "js", "ui.js"), "utf8");

const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const used = new Set([...ui.matchAll(/\bel\("([^"]+)"\)/g)].map((m) => m[1]));
const missing = [...used].filter((i) => !ids.has(i));
console.log("ids en html:", ids.size, "| el() usado:", used.size);
console.log("FALTAN:", missing.length ? missing.join(", ") : "(ninguno)");

const fns = ["buildAccTabs", "buildAccGrid", "updateAccPreview", "toggleAccSection", "pushAccToServer", "saveIdentity", "ACC_TOGGLE_OPEN", "ACC_TOGGLE_CLOSE", "updateWaiting"];
fns.forEach((f) => {
  const re = new RegExp("(function\\s+" + f + "\\b|var\\s+" + f + "\\s*=)");
  if (!re.test(ui)) console.log("FALTA declaracion de: " + f);
});

const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const classes = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
["acc-card", "acc-grid", "acc-tabs", "acc-tab", "acc-wrap", "acc-preview", "free-tag", "wait-rival", "char-badge-acc"].forEach((c) => {
  if (!css.includes("." + c)) console.log("FALTA clase CSS: ." + c);
  if (![...classes].includes(c) && !ui.includes('"' + c + '"') && !ui.includes("'" + c + "'") && !ui.includes(" " + c + " ")) {
    console.log("AVISO: clase ." + c + " no aparece ni en html ni en ui.js");
  }
});
console.log("listo");
