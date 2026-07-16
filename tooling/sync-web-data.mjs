import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const regionsRoot = resolve(workspaceRoot, "data/regions");
const webDataRoot = resolve(workspaceRoot, "apps/web/public/data");
const regionEntries = await readdir(regionsRoot, { withFileTypes: true });
const regionIds = regionEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

await mkdir(webDataRoot, { recursive: true });

for (const regionId of regionIds) {
  const sourceRoot = resolve(regionsRoot, regionId);
  const destinationRoot = resolve(webDataRoot, regionId);
  const manifest = JSON.parse(
    await readFile(resolve(sourceRoot, "manifest.json"), "utf8"),
  );
  const files = [
    "manifest.json",
    "region.json",
    ...manifest.datasets.map((dataset) => dataset.path),
  ];

  await rm(destinationRoot, { recursive: true, force: true });
  for (const file of new Set(files)) {
    await mkdir(dirname(resolve(destinationRoot, file)), { recursive: true });
    await cp(resolve(sourceRoot, file), resolve(destinationRoot, file));
  }

  console.log(`Synced ${new Set(files).size} files for ${regionId}.`);
}
