import assert from "node:assert/strict";
import test from "node:test";
import {
  infrastructureProjectSchema,
  placeSchema,
  regionSchema,
  regionalManifestSchema,
  serviceTimeSchema,
  textFor,
} from "../dist/index.js";

test("accepts a multilingual region", () => {
  const region = regionSchema.parse({
    id: "in.tn.chennai",
    name: { default: "Chennai", translations: { ta: "சென்னை" } },
    kind: "city",
    countryCode: "in",
    timezone: "Asia/Kolkata",
    languages: ["ta", "en-IN"],
  });
  assert.equal(region.countryCode, "IN");
  assert.equal(textFor(region.name, ["ta-IN"]), "சென்னை");
});

test("accepts a manifest-driven regional bundle", () => {
  const manifest = regionalManifestSchema.parse({
    schemaVersion: "1.0.0",
    bundleVersion: "2026-07-16.1",
    regionId: "in-maa",
    updatedAt: "2026-07-16T07:34:16Z",
    capabilities: {
      catalog: true,
      map: true,
      schedule: true,
      journeyPlanning: false,
      realtime: false,
      futureProjects: true,
    },
    datasets: [{
      id: "metro-network",
      mode: "metro",
      kind: "network",
      path: "modes/metro/network.json",
      format: "json",
    }],
  });
  assert.equal(manifest.regionId, "in-maa");
});

test("distinguishes a platform from its parent station", () => {
  const platform = placeSchema.parse({
    id: "in.cmrl.central.p1",
    parentId: "in.cmrl.central",
    regionId: "in.tn.chennai",
    name: { default: "Platform 1" },
    kind: "platform",
    location: { type: "Point", coordinates: [80.2729, 13.0815] },
  });
  assert.equal(platform.kind, "platform");
  assert.equal(platform.accessibility, "unknown");
});

test("supports post-midnight transit service times", () => {
  assert.equal(serviceTimeSchema.parse("25:15:00"), "25:15:00");
  assert.throws(() => serviceTimeSchema.parse("48:15:00"));
});

test("retains declared precision for future geometry", () => {
  const project = infrastructureProjectSchema.parse({
    id: "in.cmrl.phase-2",
    regionIds: ["in.tn.chennai"],
    name: { default: "Chennai Metro Phase II" },
    mode: "metro",
    kind: "new-line",
    status: "under-construction",
    geometryPrecision: "official-schematic",
  });
  assert.equal(project.geometryPrecision, "official-schematic");
});
