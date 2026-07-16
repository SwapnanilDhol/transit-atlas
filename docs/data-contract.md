# Regional data contract

Transit Atlas publishes each metropolitan area or network as an isolated regional bundle. This keeps clients independent of source formats and prevents failures in one city or mode from affecting the rest of the atlas.

## Bundle entry points

Every directory under `data/regions/` must contain:

- `region.json`: stable identity and geographic presentation defaults
- `manifest.json`: bundle version, capabilities, and a registry of all committed datasets

Clients should discover datasets through the manifest rather than assuming filenames beyond these two entry points.

## Standard layout

```text
<region-id>/
├── region.json
├── manifest.json
├── modes/
│   ├── metro/
│   │   ├── network.json
│   │   ├── network.geojson
│   │   └── service-patterns.json
│   └── bus/
│       ├── network.json
│       ├── stops.geojson
│       └── stop-matches.json
├── projects/
│   └── projects.json
└── metadata/
    ├── sources.json
    ├── import-report.json
    └── <mode>-quality.json
```

Only `region.json` and `manifest.json` are mandatory. Dataset filenames are conventional; the manifest is authoritative.

## Region identifiers

Region IDs use `<country-code>-<network-code>` in lowercase. They are identities, not translated labels. Changing an ID is a migration and should be avoided.

## Manifest datasets

Each dataset record contains:

- `id`: unique within the region
- `kind`: `network`, `geometry`, `places`, `schedule`, `projects`, `quality`, `provenance`, or `reconciliation`
- `path`: safe path relative to the region directory
- `format`: currently `json` or `geojson`
- `mode`: required when the data belongs to one transport mode

The top-level capability declaration tells clients what the complete bundle can honestly support. Capabilities are not marketing flags; they must follow verified source coverage.

## Identity and references

- Platform entity IDs are stable and globally namespaced, for example `in-maa-mtc-route-21g`.
- Upstream GTFS, OSM, or agency IDs remain source references.
- Relationships use IDs rather than embedding copies of entire entities.
- A physical interchange may have several mode-specific platforms but one parent place.

## Geometry

GeoJSON uses WGS84 longitude/latitude coordinates. Geometry records must include source attribution and confidence where relevant. Schematic diagrams must not be traced as geographic alignments.

## Time and service

- Region time zones use IANA identifiers.
- Local service times may exceed `24:00` when the source format allows overnight service.
- Static schedules, estimated predictions, and realtime observations are separate concepts.
- Every realtime object requires observation and freshness timestamps.

## Provenance and licensing

Every normalized fact must be traceable to a source registry entry or an explicit feature-level source URL. Record publisher, canonical URL, retrieval time, license, checksum when available, and transformation notes.

The repository's MIT license covers code only. Data retains its upstream license.
