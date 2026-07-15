import { z } from "zod";
import { entityIdSchema, instantSchema, pointSchema } from "./common.js";
import { localizedTextSchema } from "./localization.js";

export const freshnessSchema = z.object({
  observedAt: instantSchema,
  receivedAt: instantSchema,
  expiresAt: instantSchema.optional(),
  status: z.enum(["fresh", "stale", "expired", "unknown"]),
});
export type Freshness = z.infer<typeof freshnessSchema>;

export const serviceAlertSchema = z.object({
  id: entityIdSchema,
  header: localizedTextSchema,
  description: localizedTextSchema.optional(),
  severity: z.enum(["info", "warning", "severe", "unknown"]),
  cause: z.enum(["unknown", "maintenance", "construction", "accident", "weather", "strike", "medical", "technical", "security", "demonstration", "other"]),
  effect: z.enum(["unknown", "no-service", "reduced-service", "significant-delays", "delays", "detour", "stop-moved", "accessibility-issue", "modified-service", "other"]),
  activePeriods: z.array(z.object({ start: instantSchema.optional(), end: instantSchema.optional() })).default([]),
  informedEntityIds: z.array(entityIdSchema).default([]),
  url: z.string().url().optional(),
  freshness: freshnessSchema,
});
export type ServiceAlert = z.infer<typeof serviceAlertSchema>;

export const tripUpdateSchema = z.object({
  tripId: entityIdSchema,
  vehicleId: z.string().optional(),
  status: z.enum(["scheduled", "added", "cancelled", "replacement", "unknown"]),
  delaySeconds: z.number().int().optional(),
  stopUpdates: z.array(z.object({
    placeId: entityIdSchema,
    sequence: z.number().int().nonnegative().optional(),
    arrivalDelaySeconds: z.number().int().optional(),
    departureDelaySeconds: z.number().int().optional(),
    status: z.enum(["scheduled", "skipped", "no-data", "unknown"]).default("scheduled"),
  })).default([]),
  freshness: freshnessSchema,
});
export type TripUpdate = z.infer<typeof tripUpdateSchema>;

export const vehiclePositionSchema = z.object({
  vehicleId: z.string().min(1),
  tripId: entityIdSchema.optional(),
  lineId: entityIdSchema.optional(),
  position: pointSchema,
  bearingDegrees: z.number().min(0).lt(360).optional(),
  speedMetersPerSecond: z.number().nonnegative().optional(),
  currentPlaceId: entityIdSchema.optional(),
  occupancy: z.enum([
    "empty", "many-seats", "few-seats", "standing-room", "crushed-standing",
    "full", "not-accepting-passengers", "unknown",
  ]).default("unknown"),
  freshness: freshnessSchema,
});
export type VehiclePosition = z.infer<typeof vehiclePositionSchema>;
