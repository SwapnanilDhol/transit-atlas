# Chennai importer

Run from the repository root:

```sh
python3 tooling/importers/chennai/fetch.py
python3 tooling/importers/chennai/normalize.py
```

Corridor 3 / Purple Line is an explicit enrichment pass because its contributed
station metadata and under-construction OSM geometry have different provenance
from the operational import:

```sh
python3 tooling/importers/chennai/fetch_osm_purple.py
python3 tooling/importers/chennai/integrate_purple.py /path/to/chennai_metro_purple_line.json
```

The integration discards every coordinate in the contributed file. Its own
provenance note identifies Google Places and interpolation, which are not
redistributed. The plotted alignment and two currently mapped construction
station points come exclusively from OpenStreetMap relation 12824257 under
ODbL. The remaining contributed records supply an ordered sidebar list, Tamil
labels, layout, and connection claims pending official record-level review.

MTC buses are a separate import so a temporary outage or page change cannot
invalidate the metro bundle:

```sh
python3 tooling/importers/chennai/fetch_mtc_bus.py
python3 tooling/importers/chennai/normalize_mtc_bus.py
python3 tooling/importers/chennai/fetch_osm_bus_stops.py
python3 tooling/importers/chennai/reconcile_osm_bus_stops.py
```

The MTC fallback captures official route numbers and ordered stage names. It
does not invent coordinates, shapes, or schedules that the route pages do not
publish. Prefer an official CUMTA GTFS ZIP once the portal is reachable again.
The OSM pass plots independently mapped bus-stop points and conservatively
links high-confidence name matches to MTC stages. It does not derive route
shapes by connecting those points.

Normalized outputs follow the regional bundle contract under
`data/regions/in-maa/`: mode-specific data lives under `modes/`, future works
under `projects/`, and source/quality reports under `metadata/`. Run
`npm run data:validate` after regenerating outputs.

Raw HTML, PDF, GTFS, and retrieval manifests live under `data/raw/chennai/`
and are intentionally ignored by Git. Operational coordinates and line shapes
come from the attributed OpenStreetMap route relations; CMRL remains the source
for official station names and order. To require GTFS in automation, use
`--require-gtfs`. If CUMTA changes its page structure, pass a direct URL only
after verifying that it is an official `opendata.cumta.org` download:

```sh
python3 tooling/importers/chennai/fetch.py \
  --gtfs-url 'https://opendata.cumta.org/path/from-the-official-datasets-page.zip' \
  --require-gtfs
```
