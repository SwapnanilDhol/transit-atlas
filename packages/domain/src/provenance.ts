import { z } from "zod";
import { entityIdSchema, instantSchema, isoDateSchema } from "./common.js";
import { localizedTextSchema } from "./localization.js";

export const licenseSchema = z.object({
  id: entityIdSchema,
  name: localizedTextSchema,
  spdxId: z.string().optional(),
  url: z.string().url().optional(),
  attribution: z.string().min(1).optional(),
  allowsRedistribution: z.boolean().optional(),
  allowsCommercialUse: z.boolean().optional(),
  requiresShareAlike: z.boolean().optional(),
});
export type License = z.infer<typeof licenseSchema>;

export const sourceKindSchema = z.enum([
  "official-open-data",
  "official-document",
  "official-webpage",
  "operator-feed",
  "community-data",
  "survey",
  "derived",
  "news-report",
]);

export const dataSourceSchema = z.object({
  id: entityIdSchema,
  name: localizedTextSchema,
  kind: sourceKindSchema,
  publisher: localizedTextSchema.optional(),
  url: z.string().url(),
  licenseId: entityIdSchema.optional(),
  publishedDate: isoDateSchema.optional(),
  retrievedAt: instantSchema,
  validFrom: instantSchema.optional(),
  validUntil: instantSchema.optional(),
  notes: z.string().optional(),
});
export type DataSource = z.infer<typeof dataSourceSchema>;

export const evidenceSchema = z.object({
  sourceId: entityIdSchema,
  sourceRecordId: z.string().optional(),
  field: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1),
  observedAt: instantSchema.optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;
