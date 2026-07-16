#!/usr/bin/env python3
"""Add contributed Corridor 3 metadata and OSM geometry to Chennai outputs.

Coordinates from the contributed JSON are deliberately discarded because its
own provenance note identifies Google Places and interpolated estimates.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REGION = ROOT / "data/regions/in-maa"
METRO = REGION / "modes/metro"
METADATA = REGION / "metadata"
RAW_OSM = ROOT / "data/raw/chennai/osm/purple-12824257.json"
RAW_MANIFEST = ROOT / "data/raw/chennai/osm/purple-12824257.manifest.json"
OSM_RELATION_ID = 12824257
OSM_URL = f"https://www.openstreetmap.org/relation/{OSM_RELATION_ID}"
OFFICIAL_URL = "https://chennaimetrorail.org/project-status/"


def load(path: Path) -> dict:
    return json.loads(path.read_text())


def write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def comparable(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower().replace("metro", ""))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("metadata", type=Path, help="User-supplied Purple Line JSON")
    args = parser.parse_args()

    contribution = load(args.metadata)
    stations_input = contribution.get("stations", [])
    if len(stations_input) != 48 or [item.get("order") for item in stations_input] != list(range(1, 49)):
        raise ValueError("Expected exactly 48 sequential contributed station records")
    if not RAW_OSM.exists():
        raise FileNotFoundError("Run fetch_osm_purple.py before this importer")

    osm = load(RAW_OSM)
    elements = osm["elements"]
    nodes = {item["id"]: item for item in elements if item["type"] == "node"}
    ways = {item["id"]: item for item in elements if item["type"] == "way"}
    relation = next(item for item in elements if item["type"] == "relation" and item["id"] == OSM_RELATION_ID)
    route_way_ids = [member["ref"] for member in relation["members"] if member["type"] == "way"]

    mapped_nodes = {
        comparable(item.get("tags", {}).get("name", "")): item
        for item in nodes.values()
        if item.get("tags", {}).get("public_transport") == "station"
    }
    station_ids: list[str] = []
    purple_stations: list[dict] = []
    mapped_station_ids: set[str] = set()
    for source in stations_input:
        station_id = f"in-maa-cmrl-{slug(source['name'])}"
        station_ids.append(station_id)
        station = {
            "id": station_id,
            "name": source["name"],
            "nameTranslations": {"ta": source["name_ta"]},
            "operatorId": "in-maa-cmrl",
            "status": "under-construction",
            "sourceUrl": contribution.get("source"),
            "lineIds": ["cmrl-purple"],
            "order": source["order"],
            "layout": source["layout"].lower(),
            "connections": source.get("connections", []),
            "metadataConfidence": "contributed-unverified",
        }
        osm_node = mapped_nodes.get(comparable(source["name"]))
        if osm_node:
            station["longitude"] = osm_node["lon"]
            station["latitude"] = osm_node["lat"]
            station["geometrySourceUrl"] = f"https://www.openstreetmap.org/node/{osm_node['id']}"
            mapped_station_ids.add(station_id)
        purple_stations.append(station)

    network = load(METRO / "network.json")
    network["lines"] = [line for line in network["lines"] if line["id"] != "cmrl-purple"]
    network["lines"].append(
        {
            "id": "cmrl-purple",
            "name": "Purple Line",
            "officialCorridor": "Corridor 3",
            "color": "#800080",
            "status": "under-construction",
            "stationIds": station_ids,
            "terminals": ["Madhavaram Milk Colony", "Siruseri SIPCOT II"],
            "lengthKm": 45.8,
            "officialStationCount": 50,
            "contributedStationCount": 48,
            "stationListCompleteness": "partial-pending-official-reconciliation",
            "sourceUrl": OFFICIAL_URL,
            "geometrySourceUrl": OSM_URL,
        }
    )
    network["stations"] = [station for station in network["stations"] if "cmrl-purple" not in station["lineIds"]]
    network["stations"].extend(purple_stations)
    network["generatedAt"] = datetime.now(timezone.utc).isoformat()
    write(METRO / "network.json", network)

    geojson = load(METRO / "network.geojson")
    geojson["features"] = [
        feature for feature in geojson["features"] if feature.get("properties", {}).get("line") != "purple"
    ]
    for way_id in route_way_ids:
        way = ways[way_id]
        coordinates = [[nodes[node_id]["lon"], nodes[node_id]["lat"]] for node_id in way["nodes"]]
        geojson["features"].append(
            {
                "type": "Feature",
                "id": f"cmrl-purple-way-{way_id}",
                "properties": {
                    "id": f"cmrl-purple-way-{way_id}",
                    "name": "Purple Line",
                    "operatorId": "in-maa-cmrl",
                    "status": "under-construction",
                    "lineIds": ["cmrl-purple"],
                    "line": "purple",
                    "lines": ["purple"],
                    "source": "OpenStreetMap contributors",
                    "sourceUrl": f"https://www.openstreetmap.org/way/{way_id}",
                },
                "geometry": {"type": "LineString", "coordinates": coordinates},
            }
        )
    for station in purple_stations:
        if station["id"] not in mapped_station_ids:
            continue
        geojson["features"].append(
            {
                "type": "Feature",
                "id": station["id"],
                "properties": {
                    **{key: value for key, value in station.items() if key not in ("longitude", "latitude")},
                    "line": "purple",
                    "lines": ["purple"],
                },
                "geometry": {"type": "Point", "coordinates": [station["longitude"], station["latitude"]]},
            }
        )
    write(METRO / "network.geojson", geojson)

    stations_geojson = load(METRO / "stations.geojson")
    stations_geojson["features"] = [
        feature for feature in stations_geojson["features"] if "cmrl-purple" not in feature.get("properties", {}).get("lineIds", [])
    ] + [feature for feature in geojson["features"] if feature["geometry"]["type"] == "Point" and feature["properties"].get("line") == "purple"]
    write(METRO / "stations.geojson", stations_geojson)

    sources = load(METADATA / "sources.json")
    sources["sources"] = [source for source in sources["sources"] if source["id"] not in ("openstreetmap-cmrl-purple", "contributed-cmrl-purple-metadata")]
    sources["sources"].extend(
        [
            {
                "id": "openstreetmap-cmrl-purple",
                "publisher": "OpenStreetMap contributors",
                "title": "Chennai Metro Line 3 under-construction route relation",
                "url": OSM_URL,
                "format": "OSM JSON",
                "authority": "community-maintained geospatial data",
                "relationId": OSM_RELATION_ID,
                "license": {"status": "open", "name": "Open Database License (ODbL) 1.0", "url": "https://www.openstreetmap.org/copyright"},
            },
            {
                "id": "contributed-cmrl-purple-metadata",
                "publisher": "Transit Atlas contributor",
                "title": "Purple Line ordered station metadata supplied 2026-07-16",
                "url": contribution.get("source"),
                "format": "JSON",
                "authority": "contributed; not independently verified at record level",
                "useConstraint": "Google-derived and interpolated coordinates were discarded. Names, Tamil labels, layouts, and connection claims require reconciliation with current official CMRL sources.",
                "license": {"status": "unknown"},
            },
        ]
    )
    write(METADATA / "sources.json", sources)

    quality = load(METADATA / "metro-quality.json")
    quality["underConstructionRouteGeometryCount"] = len(route_way_ids)
    quality["purpleLineContributedStationCount"] = len(purple_stations)
    quality["purpleLineMappedStationCount"] = len(mapped_station_ids)
    quality["purpleLineOfficialStationCount"] = 50
    quality["warnings"] = [
        warning
        for warning in quality["warnings"]
        if not warning.startswith("Purple Line:")
        and not warning.startswith("No proposed or under-construction alignment geometry")
    ]
    quality["warnings"].append(
        "Purple Line: OSM supplies the approximate under-construction alignment and 2 mapped stations; 48 contributed station records are listed without their Google-derived coordinates and remain pending official reconciliation against CMRL's current total of 50 stations."
    )
    write(METADATA / "metro-quality.json", quality)

    report = load(METADATA / "import-report.json")
    osm_manifest = load(RAW_MANIFEST)
    report["artifacts"] = [artifact for artifact in report["artifacts"] if artifact.get("path") != "osm/purple-12824257.json"]
    report["artifacts"].append({"path": "osm/purple-12824257.json", "sourceUrl": OSM_URL, **{key: value for key, value in osm_manifest.items() if key != "sourceUrl"}})
    report["contributions"] = [
        {
            "file": args.metadata.name,
            "sha256": hashlib.sha256(args.metadata.read_bytes()).hexdigest(),
            "receivedAt": "2026-07-16",
            "coordinatesDiscarded": True,
            "retainedFields": ["order", "name", "name_ta", "layout", "connections"],
        }
    ]
    write(METADATA / "import-report.json", report)
    print(f"Integrated Purple Line: {len(route_way_ids)} OSM segments, {len(purple_stations)} listed stations, {len(mapped_station_ids)} mapped stations")


if __name__ == "__main__":
    main()
