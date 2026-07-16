# Bengaluru data notes

## Coverage

The `in-blr` regional bundle is the first non-Chennai city shipped by Transit Atlas. It contains the operational Namma Metro network represented by three lines:

| Line | Terminals in the source relation | Station memberships |
| --- | --- | ---: |
| Purple | Whitefield (Kadugodi)–Challaghatta | 37 |
| Green | Madavara–Silk Institute | 32 |
| Yellow | RV Road–Delta Electronics Bommasandra | 16 |

The normalized output contains 84 unique station records because Rashtreeya Vidyalaya Road is shared by Green and Yellow. The source currently represents the two Majestic platforms with line-specific names, so they remain separate records rather than being merged without an explicit parent-station source.

## Sources and provenance

Geometry and stop positions come from bounded reads of OpenStreetMap's canonical relation API:

- Purple: [relation 1798771](https://www.openstreetmap.org/relation/1798771)
- Green: [relation 1798772](https://www.openstreetmap.org/relation/1798772)
- Yellow: [relation 19421927](https://www.openstreetmap.org/relation/19421927)

The data is © OpenStreetMap contributors and licensed under ODbL 1.0. BMRCL is recorded as the operator, but the geographic dataset is not presented as an official BMRCL publication.

Each line uses one complete directional route relation. This avoids duplicate geometry from importing both directions and avoids short-turn route variants. Track ways are retained as independent `LineString` features rather than stitched by proximity, which prevents the importer from inventing connections.

## Reproduce the bundle

```bash
python3 tooling/importers/bengaluru/fetch_osm_metro.py
python3 tooling/importers/bengaluru/normalize_osm_metro.py
npm run data:validate
npm run data:sync
```

The fetcher is intentionally serial and limits each response to 8 MB. Raw API responses and checksums are written under `data/raw/bengaluru/osm/` and ignored by Git. Normalized, reviewable outputs are written to `data/regions/in-blr/`.

## Published capabilities

- Catalog: yes
- Map geometry: yes
- Station list: yes
- Timetable: no
- Journey planning: no
- Realtime vehicles: no
- Future projects: no

The UI must not infer arrival times, vehicle locations, transfers, or proposed alignments from this bundle.

## Known limitations

- OpenStreetMap is community-maintained and may lag operational or naming changes.
- A station point is included only when it is an ordered stop member of the selected route relation.
- Station facilities, entrances, accessibility, fares, ridership, service frequency, and first/last trains are not yet modeled.
- Future lines and extensions are deliberately excluded until their status and geometry can be represented with source-specific precision.
- Interchange grouping needs an explicit parent-station reconciliation pass; similar names alone are not sufficient evidence.

Contributors should update the source registry, quality report, and this document whenever relations or coverage change.
