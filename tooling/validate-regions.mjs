import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const regionsRoot = resolve(root, "data/regions");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function validateRegion(regionId) {
  const regionRoot = resolve(regionsRoot, regionId);
  const region = await readJson(resolve(regionRoot, "region.json"));
  const manifest = await readJson(resolve(regionRoot, "manifest.json"));

  assert(region.schemaVersion === "1.0.0", `${regionId}: unsupported region schemaVersion`);
  assert(region.id === regionId, `${regionId}: region.id must match its directory`);
  assert(/^[a-z]{2}-[a-z0-9-]+$/.test(region.id), `${regionId}: invalid region id`);
  assert(/^[A-Z]{2}$/.test(region.countryCode), `${regionId}: invalid countryCode`);
  assert(region.timezone.includes("/"), `${regionId}: timezone must be an IANA name`);
  assert(region.name && typeof region.name.default === "string", `${regionId}: localized region name missing`);
  assert(Array.isArray(region.languages) && region.languages.length > 0, `${regionId}: languages missing`);
  assert(region.viewport?.center, `${regionId}: default viewport missing`);
  assert(manifest.schemaVersion === "1.0.0", `${regionId}: unsupported manifest schemaVersion`);
  assert(manifest.regionId === regionId, `${regionId}: manifest.regionId mismatch`);
  assert(Array.isArray(manifest.datasets) && manifest.datasets.length > 0, `${regionId}: no datasets`);

  const ids = new Set();
  for (const dataset of manifest.datasets) {
    assert(dataset.id && !ids.has(dataset.id), `${regionId}: duplicate or missing dataset id ${dataset.id}`);
    ids.add(dataset.id);
    assert(!dataset.path.startsWith("/") && !dataset.path.includes(".."), `${regionId}: unsafe dataset path`);
    const datasetPath = resolve(regionRoot, dataset.path);
    await access(datasetPath);
    const contents = await readJson(datasetPath);
    if (dataset.format === "geojson") {
      assert(contents.type === "FeatureCollection", `${regionId}/${dataset.id}: expected FeatureCollection`);
      assert(Array.isArray(contents.features), `${regionId}/${dataset.id}: missing features array`);
    }
  }
  return manifest.datasets.length;
}

const entries = await readdir(regionsRoot, { withFileTypes: true });
const regionIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
assert(regionIds.length > 0, "No regional bundles found");

let datasetCount = 0;
for (const regionId of regionIds) datasetCount += await validateRegion(regionId);
console.log(`Validated ${regionIds.length} region bundle(s) and ${datasetCount} dataset(s).`);
