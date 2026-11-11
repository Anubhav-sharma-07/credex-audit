import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const NEXT_DIR = path.resolve(process.cwd(), ".next");
const MANIFEST_PATH = path.join(NEXT_DIR, "build-manifest.json");

// Budget limits for Next.js 16 + React 19 App Router shared baseline
const MAX_RAW_FIRST_LOAD_BYTES = 500 * 1024; // 500 KB uncompressed
const MAX_GZIP_FIRST_LOAD_BYTES = 160 * 1024; // 160 KB gzipped

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + " KB";
}

function checkBudget() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`[BUDGET] Error: Build manifest not found at ${MANIFEST_PATH}. Run 'npm run build' first.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const rootFiles = manifest.rootMainFiles || [];

  if (rootFiles.length === 0) {
    console.error("[BUDGET] Error: No rootMainFiles found in build-manifest.json");
    process.exit(1);
  }

  console.log("=================================================");
  console.log(" SpendLens First-Load Shared Bundle Budget Gate ");
  console.log("=================================================");

  let totalRawBytes = 0;
  let totalGzipBytes = 0;

  for (const relativeFilePath of rootFiles) {
    const fullPath = path.join(NEXT_DIR, relativeFilePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[BUDGET] Warning: Chunk file not found: ${fullPath}`);
      continue;
    }

    const content = fs.readFileSync(fullPath);
    const rawSize = content.length;
    const gzipSize = zlib.gzipSync(content).length;

    totalRawBytes += rawSize;
    totalGzipBytes += gzipSize;

    const baseName = path.basename(relativeFilePath);
    console.log(` - ${baseName.padEnd(40)} raw: ${formatBytes(rawSize).padStart(10)} | gzip: ${formatBytes(gzipSize).padStart(10)}`);
  }

  console.log("-------------------------------------------------");
  console.log(` Total First-Load Shared JS:              raw: ${formatBytes(totalRawBytes).padStart(10)} | gzip: ${formatBytes(totalGzipBytes).padStart(10)}`);
  console.log(` Budget Threshold:                         raw: ${formatBytes(MAX_RAW_FIRST_LOAD_BYTES).padStart(10)} | gzip: ${formatBytes(MAX_GZIP_FIRST_LOAD_BYTES).padStart(10)}`);
  console.log("=================================================");

  if (totalRawBytes > MAX_RAW_FIRST_LOAD_BYTES || totalGzipBytes > MAX_GZIP_FIRST_LOAD_BYTES) {
    console.error("[BUDGET] FAILURE: First-load JavaScript exceeds performance budget!");
    process.exit(1);
  }

  console.log("[BUDGET] SUCCESS: First-load bundle size is within budget constraints.\n");
  process.exit(0);
}

checkBudget();
