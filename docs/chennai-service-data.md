# Chennai service data

## Metro timetable model

The app presents CMRL's timetable as a compact, readable view for each
operational metro line. It includes:

- Weekday, Saturday, and Sunday/public-holiday service tabs.
- First and last departures from both termini.
- Time-banded service frequencies, expressed as minutes between trains.
- CMRL's 7 January 2026 Blue Line peak-frequency update where applicable.

The initial tab is selected using the current day in `Asia/Kolkata`; public
holidays other than Sundays are not detected automatically. The data is a
transcription of published service windows and frequencies, not an exact list
of every departure. It cannot represent delays, cancellations, dwell variation,
or temporary service changes.

There is deliberately no moving-train simulation or implied live vehicle data.

Data: `data/regions/in-maa/modes/metro/service-patterns.json`

## MTC bus network

The MTC importer currently captures the official route directory:

- 686 routes
- 1,538 normalized named stages
- 9,540 ordered route-stop memberships

MTC's route pages do not publish coordinates, shapes, calendars, or departure
times. The CUMTA portal advertises static GTFS for MTC, but the host was DNS
unreachable during the 16 July 2026 import.

An independent OpenStreetMap/Overpass import currently adds:

- 1,215 named OSM bus-stop points plotted in Bus mode
- 328 OSM point features conservatively associated by name
- 155 MTC stage identities with at least one matched OSM point
- 602 MTC routes with at least one mapped stage

Every OSM stop is displayed with OSM provenance. Only exact, normalized-alias,
or high-confidence unique fuzzy matches are linked to MTC routes. Unmatched OSM
points remain visible but do not inherit MTC route membership. Route lines are
not inferred by joining points; verified GTFS shapes are still required.

Data: `data/regions/in-maa/modes/bus/network.json`,
`data/regions/in-maa/modes/bus/stops.geojson`, and
`data/regions/in-maa/modes/bus/stop-matches.json`

## Upgrade path

1. Replace the MTC HTML fallback with verified CUMTA GTFS when available.
2. Prefer CMRL GTFS for scheduled trips and shapes when the feed is reachable.
3. Add GTFS-Realtime Trip Updates and Vehicle Positions as separate, freshness-
   stamped observations if an authorized feed becomes available.
4. Keep published timetable data clearly separate from any future real-time
   observations.
