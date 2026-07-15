import { z } from "zod";
import { accessibilitySchema, entityIdSchema, entityMetadataSchema, isoDateSchema } from "./common.js";
import { localizedTextSchema } from "./localization.js";

export const serviceTimeSchema = z.string().regex(
  /^(?:[0-9]|[0-3][0-9]|4[0-7]):[0-5]\d(?::[0-5]\d)?$/,
  "Service time may exceed 24:00 but must be below 48:00",
);

export const serviceCalendarSchema = z.object({
  id: entityIdSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  weekdays: z.object({
    monday: z.boolean(), tuesday: z.boolean(), wednesday: z.boolean(),
    thursday: z.boolean(), friday: z.boolean(), saturday: z.boolean(), sunday: z.boolean(),
  }),
  addedDates: z.array(isoDateSchema).default([]),
  removedDates: z.array(isoDateSchema).default([]),
});
export type ServiceCalendar = z.infer<typeof serviceCalendarSchema>;

export const stopCallSchema = z.object({
  sequence: z.number().int().nonnegative(),
  placeId: entityIdSchema,
  arrivalTime: serviceTimeSchema.optional(),
  departureTime: serviceTimeSchema.optional(),
  pickupType: z.enum(["regular", "none", "phone-agency", "coordinate-with-driver"]).default("regular"),
  dropOffType: z.enum(["regular", "none", "phone-agency", "coordinate-with-driver"]).default("regular"),
  timepoint: z.boolean().default(true),
  distanceAlongShapeMeters: z.number().nonnegative().optional(),
});
export type StopCall = z.infer<typeof stopCallSchema>;

export const tripSchema = z.object({
  id: entityIdSchema,
  routePatternId: entityIdSchema,
  serviceCalendarId: entityIdSchema,
  headsign: localizedTextSchema.optional(),
  shortName: z.string().optional(),
  directionId: z.string().optional(),
  blockId: z.string().optional(),
  wheelchairAccessibility: accessibilitySchema.default("unknown"),
  bicyclePolicy: z.enum(["unknown", "allowed", "not-allowed"]).default("unknown"),
  stopCalls: z.array(stopCallSchema).min(2),
  metadata: entityMetadataSchema.optional(),
});
export type Trip = z.infer<typeof tripSchema>;

export const fareProductSchema = z.object({
  id: entityIdSchema,
  name: localizedTextSchema,
  amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  media: z.array(z.enum(["cash", "paper-ticket", "smart-card", "contactless", "mobile-ticket"])).default([]),
  durationSeconds: z.number().int().positive().optional(),
});
export type FareProduct = z.infer<typeof fareProductSchema>;
