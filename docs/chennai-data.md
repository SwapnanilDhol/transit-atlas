# Chennai Metro data

This directory documents the first official-data import for the Chennai region
(`in-maa`). The pipeline is deliberately conservative: it publishes a smaller
verified dataset rather than presenting inferred geometry or unofficial facts as
authoritative.

## Current committed dataset

The generated files in `data/regions/in-maa/` contain:

- 41 unique operational CMRL stations;
- 26 Blue Line station memberships and 17 Green Line memberships;
- the two shared interchange identities (Central and Alandur), merged from the
  line-specific URLs used by the CMRL site;
- 41 station point coordinates read from the map center embedded in each
  station's official CMRL page;
- official Phase II headline facts for Corridors 3, 4, and 5; and
- provenance, retrieval timestamps, SHA-256 checksums, source status, and
  quality warnings.

`network.geojson` is the client-facing map layer. It currently contains verified
operational station `Point` features only. Its properties include `line`,
`lines`, `lineIds`, and `status`. It intentionally contains no `LineString`
features: CUMTA's official GTFS was unavailable during this run, and tracing a
schematic CMRL PDF would create false precision. The web map should treat the
absence of line geometry as a known data state, not synthesize an alignment.

## Official sources

### CUMTA transit-data portal

[CUMTA Transit Data Chennai](https://opendata.cumta.org/) advertises verified
static GTFS ZIP datasets for Metro, MTC, and suburban rail. This is the preferred
source for operational stop, route, schedule, and shape data.

On 2026-07-16, the official hostname returned DNS `NXDOMAIN`, even though the
portal remained present in recent search indexes. Consequently, a stable direct
Metro ZIP URL could not be safely verified or downloaded. The importer discovers
ZIP links from the official portal at runtime and also supports `--gtfs-url` for
a direct link manually copied from that official portal. An unofficial mirror is
not silently substituted.

The portal did not yield a machine-readable data license during this run. Until
one is captured, redistribution rights must be considered unknown. The raw ZIP
is therefore ignored by Git.

### Chennai Metro Rail Limited

The following CMRL sources are official:

- [CMRL home and station information](https://chennaimetrorail.org/)
- [CMRL project status](https://chennaimetrorail.org/project-status/)
- [Official Phase II schematic map](https://chennaimetrorail.org/wp-content/uploads/2025/03/Phase-II-Map-Updated-Map-PHASE-2.pdf)
- [Updated Phase II DPR](https://chennaimetrorail.org/wp-content/uploads/2025/07/Project-DPR-for-Chennai-Metro-Rail-Phase-II.pdf)

CMRL reports Phase II as 118.9 km and 128 stations across Corridor 3
(45.8 km, 50 stations), Corridor 4 (26.1 km, 30 stations), and Corridor 5
(47.0 km, 48 stations), with completion proposed by the end of 2028. The project
status is represented separately from operational service so planned assets do
not leak into journey-planning results.

No explicit open-data license was found on the CMRL pages. Derived factual data
is stored with source attribution; raw pages, PDFs, images, and other site assets
are not committed.

## Reproducing the import

The importer uses Python's standard library and does not require project package
installation:

```sh
python3 tooling/importers/chennai/fetch.py
python3 tooling/importers/chennai/normalize.py
```

Useful safeguards:

```sh
# Fail CI rather than produce an operational dataset without GTFS.
python3 tooling/importers/chennai/fetch.py --require-gtfs

# A verified link copied from the official CUMTA datasets page.
python3 tooling/importers/chennai/fetch.py \
  --gtfs-url 'https://opendata.cumta.org/verified-official-path.zip' \
  --require-gtfs
```

Downloads go to `data/raw/chennai/`, which is ignored except for its
`.gitignore`. `fetch.py` records response metadata, retrieval time, byte length,
and SHA-256 in the raw manifest. `normalize.py` also emits a committed
`import-report.json` containing checksums and timestamps for every raw artifact
that contributed to the generated dataset.

## Quality rules and known limitations

- Station coordinates come from the first `center: { lat, lng }` map coordinate
  in the corresponding official station page. They should be compared to the
  official GTFS once it becomes reachable.
- Coordinates are station points, not entrances, platforms, or line geometry.
- Central and Alandur each have two CMRL URLs. They are one physical station
  identity with two line memberships in the normalized model.
- The Phase II PDF is a schematic, not a georeferenced GIS dataset. It is never
  traced into GeoJSON.
- Phase II target dates are projections and must retain their source and
  year-level precision.
- No GTFS-Realtime endpoint has been verified. The app must not imply live train
  positions, live arrivals, or disruptions from this static import.
- English names reflect current official CMRL page text. Tamil names and other
  localized aliases require a separately attributable official source.
- Source HTML can change without notice. The normalizer asserts the expected 43
  line/station memberships and fails loudly if the CMRL page structure or count
  changes.

## Worldwide compatibility

The Chennai output uses globally safe identifiers (`in-maa-cmrl-*`) and keeps
region, operator, line, station, project, lifecycle status, and provenance as
separate concepts. GTFS identifiers are source identifiers rather than the sole
global identity. This lets a later New York import use the same output contract
while supporting multiple agencies, modes, feeds, languages, service calendars,
and realtime endpoints without adding Chennai-specific assumptions to the core
model.

The next data milestone is to rerun the official CUMTA download, validate its
GTFS tables and service dates, reconcile its stop IDs with these stable station
identities, and add official `LineString` shapes to `network.geojson`.
