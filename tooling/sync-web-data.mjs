import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(workspaceRoot, "data/regions/in-maa");
const destinationRoot = resolve(
  workspaceRoot,
  "apps/web/public/data/in-maa",
);

const files = [
  "network.geojson",
  "network.json",
  "projects.json",
  "data-quality.json",
  "source-registry.json",
  "import-report.json",
];

await mkdir(destinationRoot, { recursive: true });

for (const file of files) {
  await cp(resolve(sourceRoot, file), resolve(destinationRoot, file));
}

console.log(`Synced ${files.length} Chennai bundle files to the web app.`);
