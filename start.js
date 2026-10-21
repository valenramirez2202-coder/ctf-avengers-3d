/**
 * Arranca el servidor elegido con el Node que trae Laragon.
 * Uso:  start.bat  [puerto]
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const CANDIDATES = [
  "C:\\laragon\\bin\\nodejs\\node-v22\\node.exe",
  "C:\\laragon\\bin\\nodejs\\node-v20\\node.exe",
  "C:\\laragon\\bin\\nodejs\\node-v18\\node.exe"
];

function findNode() {
  for (const c of CANDIDATES) {
    if (fs.existsSync(c)) return c;
  }
  return "node";
}

const port = process.argv[2] || "3000";
const nodeExe = findNode();
const server = path.join(__dirname, "server.js");

console.log("");
console.log("  Node: " + nodeExe);
console.log("  Puerto: " + port);
console.log("");

const child = spawn(nodeExe, [server, port], {
  stdio: "inherit",
  cwd: __dirname
});

child.on("exit", (code) => process.exit(code === null ? 1 : code));
