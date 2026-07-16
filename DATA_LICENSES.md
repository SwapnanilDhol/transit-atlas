# Data licenses and attribution

The MIT License applies to source code in this repository. It does not replace the licenses or rights attached to transit and geographic data.

## Chennai (`in-maa`)

- OpenStreetMap geometry and bus-stop points: © OpenStreetMap contributors, Open Database License 1.0. See <https://www.openstreetmap.org/copyright>.
- The under-construction Purple Line alignment uses OpenStreetMap relation 12824257 under the same ODbL terms.
- CMRL station, timetable, and project facts: derived from attributed official Chennai Metro Rail Limited publications. No general open-data license was identified; factual extracts retain source URLs and should be reviewed before downstream redistribution.
- Contributed Purple Line names, Tamil labels, layouts, and connection notes have unknown licensing and remain marked as unverified. Google-derived and interpolated coordinates from the contributed file are expressly excluded from the repository.
- MTC route and ordered-stage facts: derived from the official Metropolitan Transport Corporation route directory. No general open-data license was identified; raw pages are not committed.
- CUMTA GTFS: preferred but not currently redistributed because a stable download and explicit license were unavailable during the documented import.

Consult `data/regions/in-maa/metadata/sources.json`, quality reports, and Chennai documentation for record-level provenance and limitations.

## Bengaluru (`in-blr`)

- Namma Metro route geometry and station points: © OpenStreetMap contributors, Open Database License 1.0. See <https://www.openstreetmap.org/copyright>.
- The current bundle uses the Purple, Green, and Yellow route relations identified in `data/regions/in-blr/metadata/sources.json`.
- BMRCL is named only as the network operator. This repository does not claim that the geographic bundle is an official BMRCL dataset.
- No schedule, realtime, ridership, fare, or future-project data is redistributed in the Bengaluru bundle.

Consult `data/regions/in-blr/metadata/sources.json`, `metadata/metro-quality.json`, and [the Bengaluru data notes](docs/bengaluru-data.md) before reuse.

Contributors must add equivalent licensing notes for each new region.
