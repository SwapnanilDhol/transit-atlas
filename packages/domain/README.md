# `@transit-atlas/domain`

Framework-neutral TypeScript domain contracts for Transit Atlas. The package has no React, Next.js, Node-only, database, or map-renderer dependency, so the same parsed objects can be used by web apps, native mobile apps, ingestion workers, APIs, and offline bundles.

## Principles

- **Canonical IDs are not feed IDs.** Stable internal IDs survive upstream GTFS changes; `externalIds` retain identifiers from every source namespace.
- **Places are hierarchical.** A station complex, station, stop, platform, entrance, and boarding area are distinct entities connected through `parentId`.
- **Infrastructure is not service.** A planned alignment/project has evidence, precision, status, sections, and milestones. A line and its route patterns describe the passenger-facing network. Trips describe scheduled service.
- **Every claim can be sourced.** Entities refer to `DataSource` records that retain publisher, URL, retrieval time, validity, license, and confidence.
- **Localization is first-class.** User-visible text has a default plus BCP 47 translations; it is never encoded in field names.
- **Capabilities are explicit.** Clients can discover whether a region supports realtime data, fares, accessibility, journey planning, future projects, or offline downloads.
- **Realtime is perishable.** Live records include observation, receipt, expiry, and freshness status.
- **Future geometry communicates uncertainty.** Conceptual and digitized alignments cannot silently masquerade as surveyed geometry.

## Modules

| Module | Responsibility |
| --- | --- |
| `common` | Stable/external IDs, timestamps, accessibility, lightweight GeoJSON geometry |
| `localization` | Localized text/URLs and language fallback |
| `provenance` | Sources, licenses, attribution, field-level evidence |
| `network` | Regions, agencies, modes, lines, places, route patterns, lifecycle status |
| `service` | Calendars, trips, stop calls, fares and post-midnight service times |
| `projects` | Infrastructure projects, sections, milestones, cost and geometry precision |
| `realtime` | Freshness, service alerts and trip updates |
| `dataset` | Versioned bundles, record counts, QA state and regional capabilities |

## Usage

```ts
import { placeSchema, type Place } from "@transit-atlas/domain";

const place: Place = placeSchema.parse(untrustedInput);
```

Use the Zod schemas at ingestion and API boundaries. Inside trusted application code, use the inferred TypeScript types. Prefer additive schema evolution and bump `schemaVersion` in dataset manifests whenever consumers need a migration.

## Commands

```sh
npm install
npm run check
npm test
```

## Deliberate non-goals

This package does not define database tables, API transport envelopes, UI view models, routing algorithms, or full GeoJSON feature collections. Those belong in adapters so the core vocabulary remains portable across Chennai, New York, and future regions.
