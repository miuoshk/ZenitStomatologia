#!/usr/bin/env node
/**
 * pnpm brand:sync [ścieżka-do-Materialy-marki]
 * Kopiuje pakiet marki 1:1 do brand/ i zapisuje SHA-256 w brand/manifest.json.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.join(__dirname, "..");
const cruxRoot = path.join(uiRoot, "../..");
const defaultMarka = path.join(cruxRoot, "../Materialy marki");
const defaultCruxDev = path.join(cruxRoot, "../Crux - dla tworcow aplikacji");

const markaRoot = path.resolve(process.argv[2] ?? defaultMarka);
const cruxDevRoot = path.resolve(process.argv[3] ?? defaultCruxDev);

async function sha256(filePath) {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyGlob(srcDir, destDir, filter) {
  await ensureDir(destDir);
  const entries = await readdir(srcDir, { withFileTypes: true });
  const copied = [];
  for (const entry of entries) {
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copied.push(...(await copyGlob(from, to, filter)));
    } else if (!filter || filter(entry.name)) {
      await copyFile(from, to);
      copied.push(to);
    }
  }
  return copied;
}

async function main() {
  await stat(markaRoot);
  const files = [];

  files.push(
    ...(await (async () => {
      await ensureDir(path.join(uiRoot, "brand"));
      const dest = path.join(uiRoot, "brand/tokens.css");
      await copyFile(path.join(markaRoot, "tokeny/tokens.css"), dest);
      return [dest];
    })()),
  );
  files.push(
    ...(await (async () => {
      const dest = path.join(uiRoot, "brand/zenit-theme.tailwind.css");
      await copyFile(path.join(markaRoot, "tokeny/zenit-theme.tailwind.css"), dest);
      return [dest];
    })()),
  );

  files.push(
    ...(await copyGlob(path.join(markaRoot, "font"), path.join(uiRoot, "brand/fonts"), (n) =>
      n.endsWith(".ttf") || n.toUpperCase().includes("LICENCJA"),
    )),
  );
  files.push(
    ...(await copyGlob(path.join(markaRoot, "crux/logo"), path.join(uiRoot, "brand/logo/crux"), (n) =>
      n.endsWith(".svg"),
    )),
  );
  files.push(
    ...(await copyGlob(path.join(markaRoot, "zenit/logo"), path.join(uiRoot, "brand/logo/zenit"), (n) =>
      n.endsWith(".svg"),
    )),
  );
  files.push(
    ...(await copyGlob(
      path.join(markaRoot, "ryciny-kohler/svg"),
      path.join(uiRoot, "brand/ryciny"),
      (n) => n.endsWith(".svg"),
    )),
  );

  const ryciny48src = path.join(markaRoot, "ryciny-kohler/svg-48px");
  try {
    await stat(ryciny48src);
    files.push(
      ...(await copyGlob(ryciny48src, path.join(uiRoot, "brand/ryciny-48"), (n) => n.endsWith(".svg"))),
    );
  } catch {
    files.push(
      ...(await copyGlob(
        path.join(cruxDevRoot, "ryciny/svg-48px"),
        path.join(uiRoot, "brand/ryciny-48"),
        (n) => n.endsWith(".svg"),
      )),
    );
  }

  await ensureDir(path.join(uiRoot, "src/brand"));
  await ensureDir(path.join(uiRoot, "src/charts/__reference__"));
  const geoCrux = path.join(uiRoot, "src/brand/crux-geometry.json");
  const geoArch = path.join(uiRoot, "src/charts/arch-geometry.json");
  await copyFile(path.join(cruxDevRoot, "geometria/crux-geometria.json"), geoCrux);
  await copyFile(path.join(cruxDevRoot, "geometria/luk-geometria.json"), geoArch);
  files.push(geoCrux, geoArch);
  files.push(
    ...(await copyGlob(
      path.join(cruxDevRoot, "wykresy-przyklady"),
      path.join(uiRoot, "src/charts/__reference__"),
      (n) => n.endsWith(".svg"),
    )),
  );

  const manifest = {
    syncedAt: new Date().toISOString(),
    markaRoot,
    cruxDevRoot,
    files: {},
  };
  for (const abs of files) {
    const rel = path.relative(uiRoot, abs).split(path.sep).join("/");
    manifest.files[rel] = await sha256(abs);
  }
  const manifestPath = path.join(uiRoot, "brand/manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`brand:sync → ${Object.keys(manifest.files).length} plików → brand/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
