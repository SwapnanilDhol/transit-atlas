#!/usr/bin/env python3
"""Normalize operational Namma Metro OSM relations into a regional bundle."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "bengaluru" / "osm"
REGION = ROOT / "data" / "regions" / "in-blr"
METRO = REGION / "modes" / "metro"
METADATA = REGION / "metadata"

LINES = {
    "purple": {"relationId": 1798771, "color": "#8A3FFC", "terminals": ["Whitefield (Kadugodi)", "Challaghatta"]},
    "green": {"relationId": 1798772, "color": "#009B77", "terminals": ["Madavara", "Silk Institute"]},
    "yellow": {"relationId": 19421927, "color": "#E3B505", "terminals": ["Rashtreeya Vidyalaya Road", "Delta Electronics Bommasandra"]},
}


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    result = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return result or hashlib.sha1(value.encode()).hexdigest()[:12]


def display_name(tags: dict, fallback: str) -> str:
    return tags.get("name:en") or tags.get("name") or tags.get("official_name") or fallback


def main() -> None:
    station_records: dict[str, dict] = {}
    station_order: list[str] = []
    line_records = []
    map_features = []
    source_records = []
    artifacts = []

    for line_name, config in LINES.items():
        relation_id = config["relationId"]
        path = RAW / f"{line_name}-{relation_id}.json"
        if not path.exists():
            raise SystemExit("Run fetch_osm_metro.py first")
        payload = path.read_bytes()
        data = json.loads(payload)
        elements = data["elements"]
        nodes = {item["id"]: item for item in elements if item["type"] == "node"}
        ways = {item["id"]: item for item in elements if item["type"] == "way"}
        relation = next(item for item in elements if item["type"] == "relation" and item["id"] == relation_id)
        line_id = f"bmrcl-{line_name}"
        ordered_station_ids = []

        for member in relation["members"]:
            if member["type"] != "node" or member.get("role") not in {"stop", "platform"}:
                continue
            node = nodes.get(member["ref"])
            if not node or "lat" not in node or "lon" not in node:
                continue
            name = display_name(node.get("tags", {}), f"OSM stop {node['id']}")
            identity_key = slug(name)
            station_id = f"in-blr-bmrcl-{identity_key}"
            if station_id not in station_records:
                station_records[station_id] = {
                    "id": station_id,
                    "name": name,
                    "operatorId": "in-blr-bmrcl",
                    "status": "operational",
                    "sourceUrl": f"https://www.openstreetmap.org/node/{node['id']}",
                    "lineIds": [],
                    "longitude": node["lon"],
                    "latitude": node["lat"],
                }
                station_order.append(station_id)
            if line_id not in station_records[station_id]["lineIds"]:
                station_records[station_id]["lineIds"].append(line_id)
            if station_id not in ordered_station_ids:
                ordered_station_ids.append(station_id)

        line_records.append({
            "id": line_id,
            "name": f"{line_name.title()} Line",
            "officialCorridor": "Namma Metro",
            "color": config["color"],
            "status": "operational",
            "stationIds": ordered_station_ids,
            "terminals": config["terminals"],
            "sourceUrl": f"https://www.openstreetmap.org/relation/{relation_id}",
        })

        for member in relation["members"]:
            if member["type"] != "way":
                continue
            way = ways.get(member["ref"])
            if not way:
                continue
            coordinates = [
                [nodes[node_id]["lon"], nodes[node_id]["lat"]]
                for node_id in way.get("nodes", [])
                if node_id in nodes and "lat" in nodes[node_id] and "lon" in nodes[node_id]
            ]
            if len(coordinates) < 2:
                continue
            map_features.append({
                "type": "Feature",
                "id": f"{line_id}-way-{way['id']}",
                "properties": {
                    "id": f"{line_id}-way-{way['id']}",
                    "line": line_name,
                    "lines": [line_name],
                    "lineIds": [line_id],
                    "status": "operational",
                    "sourceUrl": f"https://www.openstreetmap.org/way/{way['id']}",
                },
                "geometry": {"type": "LineString", "coordinates": coordinates},
            })

        source_records.append({
            "id": f"osm-namma-metro-{line_name}",
            "publisher": "OpenStreetMap contributors",
            "url": f"https://www.openstreetmap.org/relation/{relation_id}",
            "license": "ODbL-1.0",
            "mode": "metro",
            "lineId": line_id,
        })
        artifacts.append({
            "path": path.relative_to(ROOT).as_posix(),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "bytes": len(payload),
        })

    stations = [station_records[station_id] for station_id in station_order]
    for station in stations:
        map_features.append({
            "type": "Feature",
            "id": station["id"],
            "properties": {
                "id": station["id"],
                "name": station["name"],
                "line": station["lineIds"][0].removeprefix("bmrcl-"),
                "lines": [line_id.removeprefix("bmrcl-") for line_id in station["lineIds"]],
                "lineIds": station["lineIds"],
                "status": "operational",
                "sourceUrl": station["sourceUrl"],
            },
            "geometry": {"type": "Point", "coordinates": [station["longitude"], station["latitude"]]},
        })

    generated_at = datetime.now(timezone.utc).isoformat()
    network = {
        "schemaVersion": "1.0.0",
        "region": {"id": "in-blr", "name": "Bengaluru", "countryCode": "IN", "timezone": "Asia/Kolkata"},
        "operator": {"id": "in-blr-bmrcl", "name": "Bangalore Metro Rail Corporation Limited", "shortName": "BMRCL", "mode": "metro"},
        "lines": line_records,
        "stations": stations,
        "generatedAt": generated_at,
    }
    quality = {
        "schemaVersion": "1.0.0",
        "generatedAt": generated_at,
        "status": "passed-with-warnings",
        "operationalLineCount": len(line_records),
        "uniqueStationCount": len(stations),
        "lineStationMembershipCount": sum(len(line["stationIds"]) for line in line_records),
        "routeGeometrySegmentCount": sum(1 for feature in map_features if feature["geometry"]["type"] == "LineString"),
        "warnings": [
            "Geometry and station points are sourced from OpenStreetMap route relations under ODbL.",
            "Only operational Purple, Green, and Yellow lines are included in this first Bengaluru bundle.",
            "No official schedule or realtime feed is included; the UI must not imply live service.",
        ],
    }

    METRO.mkdir(parents=True, exist_ok=True)
    METADATA.mkdir(parents=True, exist_ok=True)
    (METRO / "network.json").write_text(json.dumps(network, ensure_ascii=False, indent=2) + "\n")
    (METRO / "network.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": map_features}, ensure_ascii=False, separators=(",", ":")) + "\n")
    (METRO / "stations.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": [feature for feature in map_features if feature["geometry"]["type"] == "Point"]}, ensure_ascii=False, separators=(",", ":")) + "\n")
    (METADATA / "sources.json").write_text(json.dumps({"schemaVersion": "1.0.0", "sources": source_records}, indent=2) + "\n")
    (METADATA / "metro-quality.json").write_text(json.dumps(quality, indent=2) + "\n")
    (METADATA / "import-report.json").write_text(json.dumps({"schemaVersion": "1.0.0", "generatedAt": generated_at, "artifacts": artifacts}, indent=2) + "\n")
    print(f"Normalized {len(line_records)} lines, {len(stations)} stations, and {quality['routeGeometrySegmentCount']} geometry segments")


if __name__ == "__main__":
    main()
