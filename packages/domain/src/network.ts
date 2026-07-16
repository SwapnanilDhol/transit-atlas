import { z } from "zod";
import {
  accessibilitySchema,
  entityIdSchema,
  entityMetadataSchema,
  geometrySchema,
  languageTagSchema,
  pointSchema,
} from "./common.js";
import { localizedTextSchema } from "./localization.js";

export const modeSchema = z.enum([
  "metro", "subway", "light-rail", "tram", "monorail", "commuter-rail",
  "regional-rail", "intercity-rail", "high-speed-rail", "bus", "brt",
  "trolleybus", "ferry", "cable-car", "gondola", "funicular",
  "demand-responsive", "shared-mobility", "walk", "other",
]);
export type Mode = z.infer<typeof modeSchema>;

export const regionSchema = z.object({
  schemaVersion: z.string().optional(),
  id: entityIdSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  name: localizedTextSchema,
  kind: z.enum(["world", "country", "territory", "state", "province", "metro-area", "city", "district"]),
  parentId: entityIdSchema.optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  timezone: z.string().min(1),
  languages: z.array(languageTagSchema).min(1),
  defaultLocale: languageTagSchema.optional(),
  supportedModes: z.array(modeSchema).default([]),
  viewport: z.object({
    center: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    zoom: z.number().min(0).max(24),
    boundingBox: z.object({
      south: z.number().min(-90).max(90),
      west: z.number().min(-180).max(180),
      north: z.number().min(-90).max(90),
      east: z.number().min(-180).max(180),
    }),
  }).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  geometry: geometrySchema.optional(),
  metadata: entityMetadataSchema.optional(),
});
export type Region = z.infer<typeof regionSchema>;

export const agencySchema = z.object({
  id: entityIdSchema,
  name: localizedTextSchema,
  shortName: localizedTextSchema.optional(),
  regionIds: z.array(entityIdSchema).min(1),
  roles: z.array(z.enum(["operator", "authority", "infrastructure-owner", "data-publisher", "contractor"])).min(1),
  website: z.string().url().optional(),
  customerService: z.object({ phone: z.string().optional(), email: z.string().email().optional() }).optional(),
  metadata: entityMetadataSchema.optional(),
});
export type Agency = z.infer<typeof agencySchema>;

export const lifecycleStatusSchema = z.enum([
  "operational", "partially-operational", "temporarily-closed", "suspended",
  "under-construction", "approved", "tendered", "planned", "proposed",
  "study", "cancelled", "decommissioned", "unknown",
]);

export const lineSchema = z.object({
  id: entityIdSchema,
  agencyIds: z.array(entityIdSchema).min(1),
  regionIds: z.array(entityIdSchema).min(1),
  name: localizedTextSchema,
  shortName: localizedTextSchema.optional(),
  mode: modeSchema,
  status: lifecycleStatusSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  geometry: geometrySchema.optional(),
  openedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metadata: entityMetadataSchema.optional(),
});
export type Line = z.infer<typeof lineSchema>;

export const placeKindSchema = z.enum([
  "station-complex", "station", "stop", "platform", "entrance", "boarding-area",
  "interchange", "depot", "yard", "landmark",
]);

export const placeSchema = z.object({
  id: entityIdSchema,
  parentId: entityIdSchema.optional(),
  regionId: entityIdSchema,
  name: localizedTextSchema,
  kind: placeKindSchema,
  location: pointSchema,
  geometry: geometrySchema.optional(),
  status: lifecycleStatusSchema.default("operational"),
  accessibility: accessibilitySchema.default("unknown"),
  lineIds: z.array(entityIdSchema).default([]),
  platformCode: z.string().optional(),
  level: z.number().optional(),
  zoneIds: z.array(entityIdSchema).default([]),
  amenities: z.array(z.enum([
    "lift", "escalator", "toilet", "accessible-toilet", "parking", "bicycle-parking",
    "ticket-office", "ticket-machine", "retail", "wifi", "help-point", "baby-changing",
  ])).default([]),
  metadata: entityMetadataSchema.optional(),
});
export type Place = z.infer<typeof placeSchema>;

export const routePatternSchema = z.object({
  id: entityIdSchema,
  lineId: entityIdSchema,
  name: localizedTextSchema.optional(),
  directionId: z.string().optional(),
  headsign: localizedTextSchema.optional(),
  mode: modeSchema,
  orderedPlaceIds: z.array(entityIdSchema).min(2),
  geometry: geometrySchema.optional(),
  isExpress: z.boolean().default(false),
  metadata: entityMetadataSchema.optional(),
});
export type RoutePattern = z.infer<typeof routePatternSchema>;
