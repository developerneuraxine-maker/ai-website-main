#!/usr/bin/env node
// Fixes CJS/ESM interop for @vercel/nft + nf3 so rolldown (Vite 8) can handle named imports.
// Run automatically via "postinstall" in package.json.
import { readFileSync, writeFileSync, existsSync } from "fs";

// --- Patch 1: Add ESM exports to @vercel/nft ---
const nftPkgPath = "node_modules/@vercel/nft/package.json";
const nftEsmPath = "node_modules/@vercel/nft/index.mjs";

if (existsSync(nftPkgPath)) {
  const pkg = JSON.parse(readFileSync(nftPkgPath, "utf8"));
  if (!pkg.exports) {
    pkg.exports = {
      ".": {
        import: "./index.mjs",
        require: "./out/index.js",
      },
    };
    writeFileSync(nftPkgPath, JSON.stringify(pkg, null, 2));
    writeFileSync(
      nftEsmPath,
      `import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("./out/index.js");
export const nodeFileTrace = pkg.nodeFileTrace;
export const resolve = pkg.resolve;
export default pkg;
`,
    );
    console.log("[patch-vercel-nft] patched @vercel/nft with ESM exports.");
  }
}

// --- Patch 2: Fix nf3's named import of @vercel/nft ---
const nf3TracePath = "node_modules/nf3/dist/_chunks/trace.mjs";
if (existsSync(nf3TracePath)) {
  let src = readFileSync(nf3TracePath, "utf8");
  if (src.includes('import { nodeFileTrace } from "@vercel/nft"')) {
    src = src.replace(
      'import { nodeFileTrace } from "@vercel/nft";',
      'import _vercelNft from "@vercel/nft";\nconst { nodeFileTrace } = _vercelNft;',
    );
    writeFileSync(nf3TracePath, src);
    console.log("[patch-vercel-nft] patched nf3 trace.mjs CJS named import.");
  }
}

console.log("[patch-vercel-nft] done.");
