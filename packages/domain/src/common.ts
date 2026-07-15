import { z } from "zod";

export const entityIdSchema = z.string().min(1).max(160).regex(
  /^[a-z0-9][a-z0-9._:-]*$/,
  "IDs must be stable, lowercase, and URL-safe",
);
export type EntityId = z.infer<typeof entityIdSchema>;

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const instantSchema = z.string().datetime({ offset: true });
export const urlSchema = z.string().url();
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const languageTagSchema = z.string().min(2).max(35).regex(
  /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/,
  "Expected a BCP 47 language tag",
);

export const externalIdSchema = z.object({
  namespace: z.string().min(1).max(80),
  value: z.string().min(1).max(300),
  sourceId: entityIdSchema.optional(),
});
export type ExternalId = z.infer<typeof externalIdSchema>;

export const positionSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
export type Position = z.infer<typeof positionSchema>;

export const pointSchema = z.object({
  type: z.literal("Point"),
  coordinates: positionSchema,
});
export const lineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(positionSchema).min(2),
});
export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(positionSchema).min(4)).min(1),
});
export const geometrySchema = z.discriminatedUnion("type", [
  pointSchema,
  lineStringSchema,
  polygonSchema,
]);
export type Geometry = z.infer<typeof geometrySchema>;

export const accessibilitySchema = z.enum([
  "unknown",
  "accessible",
  "partially-accessible",
  "not-accessible",
]);

export const entityMetadataSchema = z.object({
  externalIds: z.array(externalIdSchema).default([]),
  sourceRefs: z.array(entityIdSchema).default([]),
  createdAt: instantSchema.optional(),
  updatedAt: instantSchema.optional(),
});
export type EntityMetadata = z.infer<typeof entityMetadataSchema>;
