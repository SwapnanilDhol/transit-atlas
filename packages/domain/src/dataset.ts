import { z } from "zod";
import { entityIdSchema, instantSchema, isoDateSchema } from "./common.js";

export const capabilitySchema = z.enum([
  "static-network", "scheduled-service", "fares", "realtime-trip-updates",
  "realtime-vehicle-positions", "realtime-alerts", "station-amenities",
  "accessibility", "parking", "ridership", "journey-planning", "future-projects",
  "construction-progress", "shared-mobility", "offline-bundle",
]);
export type Capability = z.infer<typeof capabilitySchema>;

export const datasetVersionSchema = z.object({
  id: entityIdSchema,
  datasetId: entityIdSchema,
  version: z.string().min(1),
  schemaVersion: z.string().min(1),
  regionIds: z.array(entityIdSchema).min(1),
  sourceIds: z.array(entityIdSchema).min(1),
  capabilities: z.array(capabilitySchema).default([]),
  generatedAt: instantSchema,
  validFrom: isoDateSchema.optional(),
  validUntil: isoDateSchema.optional(),
  checksum: z.string().optional(),
  previousVersionId: entityIdSchema.optional(),
  recordCounts: z.record(z.string(), z.number().int().nonnegative()).default({}),
  quality: z.object({
    status: z.enum(["passed", "passed-with-warnings", "failed", "not-checked"]),
    checkedAt: instantSchema.optional(),
    warningCount: z.number().int().nonnegative().default(0),
    errorCount: z.number().int().nonnegative().default(0),
  }).default({ status: "not-checked", warningCount: 0, errorCount: 0 }),
});
export type DatasetVersion = z.infer<typeof datasetVersionSchema>;

export const regionCapabilitiesSchema = z.object({
  regionId: entityIdSchema,
  datasetVersionId: entityIdSchema,
  capabilities: z.array(capabilitySchema),
  limitations: z.array(z.string()).default([]),
});
export type RegionCapabilities = z.infer<typeof regionCapabilitiesSchema>;
