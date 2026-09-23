import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const configPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../next.config.ts"
);
const source = fs.readFileSync(configPath, "utf8");
const pinsAppRoot = /turbopack:\s*\{[^}]*root:\s*path\.join\(__dirname\)/s.test(source);

if (!pinsAppRoot) {
  console.error(
    "FAIL next.config.ts does not set turbopack.root to path.join(__dirname). Without that, Next 16 treats the Code_Projects lockfile as the workspace root and the first compile of / never finishes."
  );
  process.exit(1);
}

console.log("PASS turbopack.root is pinned to the app directory");
