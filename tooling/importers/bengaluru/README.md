# Bengaluru importer

The first Bengaluru bundle uses one operational-direction OpenStreetMap route
relation for each current Namma Metro line. The importer preserves ODbL
attribution and does not infer schedules, realtime service, or future geometry.

```bash
python3 tooling/importers/bengaluru/fetch_osm_metro.py
python3 tooling/importers/bengaluru/normalize_osm_metro.py
npm run data:validate
npm run data:sync
```

Raw API responses are bounded, checksummed, and ignored by Git.
