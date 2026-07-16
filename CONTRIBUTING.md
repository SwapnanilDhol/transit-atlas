# Contributing to Transit Atlas

Thank you for helping make public-transport information easier to explore. Contributions can improve the application, shared schemas, documentation, import tooling, or regional data.

## Before opening a pull request

1. Search existing issues and pull requests.
2. For a new city, open a city-data issue describing the agencies, available feeds, licenses, and expected coverage.
3. Keep fetching, normalization, and presentation separate.
4. Run `npm run check` and relevant importer checks.
5. Explain the source and limitations of every new dataset.

## Add a city or region

Use a stable lowercase region identifier: `<iso-3166-1-alpha-2>-<metro-or-network-code>`.

Examples: `in-maa`, `us-nyc`, `gb-lon`, or `ch-national`.

Create this minimum structure:

```text
data/regions/<region-id>/
├── region.json
├── manifest.json
├── modes/
│   └── <mode>/
├── projects/
└── metadata/
    ├── sources.json
    └── <mode>-quality.json
```

Copy the examples in `data/templates/region`, then:

- Describe the geography, time zone, locales, viewport, and supported modes in `region.json`.
- Register every committed dataset in `manifest.json` using a region-relative path.
- Use canonical modes such as `metro`, `bus`, `tram`, `rail`, `ferry`, or `cable-car`.
- Keep mode data isolated so one broken feed does not invalidate unrelated transport.
- Declare capabilities from verified data. Do not set `realtime: true` for static schedules.
- Include a quality report with counts, missing fields, assumptions, and warnings.
- Add an importer under `tooling/importers/<city>/` when outputs are derived.

Run:

```bash
npm run data:validate
npm run data:sync
```

The validator checks identifiers, manifest paths, JSON parsing, and basic GeoJSON structure. New contracts should also add schema-level tests to `packages/domain`.

## Importer design

Prefer two explicit stages:

1. `fetch` downloads source material into `data/raw/<city>/` with response limits, a descriptive user agent, checksums, retrieval timestamps, and retry limits.
2. `normalize` converts raw source records into the regional contract and writes quality/provenance reports.

Raw source files are intentionally ignored by Git. Do not commit agency PDFs, HTML pages, GTFS archives, imagery, API responses, or credentials unless their license explicitly permits redistribution and the file is necessary.

Importers must:

- Use bounded response sizes and timeouts.
- Avoid uncontrolled concurrency; default to four workers or fewer.
- Fail loudly when source structure changes.
- Preserve upstream identifiers as source identifiers, not global identities.
- Produce deterministic ordering where practical.
- Avoid inventing geometry, schedules, translations, or realtime information.

## Acceptable data sources

Good sources include official agency feeds, government open-data portals, openly licensed GIS files, GTFS-family feeds, and OpenStreetMap.

Do not contribute:

- Scraped Google Maps, Apple Maps, or other proprietary map content
- Data with unclear redistribution rights presented as openly licensed
- Personal information or private API responses
- Guessed route alignments derived by connecting stops
- Rumours presented as approved projects
- Simulated vehicles presented as live data

When a license is unclear, include discovery metadata but leave the dataset out of committed distributable files until rights are resolved.

## Code contributions

```bash
npm install
npm run check
npm test
```

Keep UI capability-driven: a missing feed should produce an honest unavailable state, not fabricated content. Respect light/dark preferences, reduced motion, keyboard navigation, touch targets, and localization.

## Pull-request checklist

- [ ] The change has one clear purpose.
- [ ] New datasets are registered in the regional manifest.
- [ ] Source, license, retrieval date, and limitations are documented.
- [ ] Generated data can be reproduced by committed tooling.
- [ ] No raw copyrighted or secret material is committed.
- [ ] `npm run check` passes.
- [ ] Relevant tests pass.
- [ ] Screenshots are included for visible UI changes.

By contributing code, you agree that it may be distributed under the repository's MIT License. Data remains subject to its declared source license.
