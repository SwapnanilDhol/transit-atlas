import { z } from "zod";
import { entityIdSchema, entityMetadataSchema, geometrySchema, isoDateSchema } from "./common.js";
import { lifecycleStatusSchema, modeSchema } from "./network.js";
import { localizedTextSchema } from "./localization.js";

export const geometryPrecisionSchema = z.enum([
  "surveyed", "engineering", "official-detailed", "official-schematic", "digitized-approximate", "conceptual", "unknown",
]);

export const projectMilestoneSchema = z.object({
  id: entityIdSchema,
  name: localizedTextSchema,
  status: z.enum(["not-started", "in-progress", "complete", "delayed", "cancelled", "unknown"]),
  plannedDate: isoDateSchema.optional(),
  actualDate: isoDateSchema.optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  sourceRefs: z.array(entityIdSchema).default([]),
});

export const projectSectionSchema = z.object({
  id: entityIdSchema,
  name: localizedTextSchema,
  status: lifecycleStatusSchema,
  geometry: geometrySchema.optional(),
  geometryPrecision: geometryPrecisionSchema.default("unknown"),
  stationPlaceIds: z.array(entityIdSchema).default([]),
  lengthMeters: z.number().nonnegative().optional(),
  structure: z.enum(["underground", "at-grade", "elevated", "mixed", "unknown"]).default("unknown"),
  progressPercent: z.number().min(0).max(100).optional(),
});

export const infrastructureProjectSchema = z.object({
  id: entityIdSchema,
  regionIds: z.array(entityIdSchema).min(1),
  agencyIds: z.array(entityIdSchema).default([]),
  relatedLineIds: z.array(entityIdSchema).default([]),
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  mode: modeSchema,
  kind: z.enum(["new-line", "extension", "station", "upgrade", "electrification", "maintenance", "other"]),
  status: lifecycleStatusSchema,
  geometry: geometrySchema.optional(),
  geometryPrecision: geometryPrecisionSchema.default("unknown"),
  announcedDate: isoDateSchema.optional(),
  plannedOpeningDate: isoDateSchema.optional(),
  actualOpeningDate: isoDateSchema.optional(),
  cost: z.object({ amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), priceYear: z.number().int().optional() }).optional(),
  sections: z.array(projectSectionSchema).default([]),
  milestones: z.array(projectMilestoneSchema).default([]),
  metadata: entityMetadataSchema.optional(),
});
export type InfrastructureProject = z.infer<typeof infrastructureProjectSchema>;
