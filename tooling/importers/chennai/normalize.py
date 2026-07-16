#!/usr/bin/env python3
"""Normalize official CMRL pages and an optional CUMTA GTFS feed."""

from __future__ import annotations

import csv
import hashlib
import html
import io
import json
import re
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "chennai"
OUT = ROOT / "data" / "regions" / "in-maa"
METRO_OUT = OUT / "modes" / "metro"
PROJECTS_OUT = OUT / "projects"
METADATA_OUT = OUT / "metadata"

LINE_CONFIG = {
    "cmrl-blue": {"name": "Blue Line", "officialCorridor": "Corridor 1", "color": "#0078C8"},
    "cmrl-green": {"name": "Green Line", "officialCorridor": "Corridor 2", "color": "#009B77"},
}
OSM_ROUTE_CONFIG = {
    "cmrl-blue": {
        "relationId": "8037595",
        "path": RAW / "osm" / "blue-8037595.osm",
        "sourceUrl": "https://www.openstreetmap.org/relation/8037596",
    },
    "cmrl-green": {
        "relationId": "8037605",
        "path": RAW / "osm" / "green-8037605.osm",
        "sourceUrl": "https://www.openstreetmap.org/relation/7845614",
    },
}
ALIASES = {
    "puratchi-thalaivar-dr-m-g-ramachandran-central-metro-2": "puratchi-thalaivar-dr-m-g-ramachandran-central-metro",
    "arignar-anna-alandur-metro-2": "arignar-anna-alandur-metro",
}


def station_anchors(source: str) -> list[tuple[str, str]]:
    pattern = re.compile(
        r'<a\s+href="(https://chennaimetrorail\.org/station-information/[^"/]+/)"\s+class="timeline__content">(.*?)</a>',
        re.S,
    )
    result = []
    for url, body in pattern.findall(source):
        name = html.unescape(re.sub(r"<[^>]+>", " ", body))
        name = " ".join(name.split())
        slug = urllib.parse.urlparse(url).path.rstrip("/").split("/")[-1]
        result.append((slug, name))
    return result


def squared_distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def osm_route(line_id: str) -> tuple[list[tuple[float, float]], list[list[float]]]:
    config = OSM_ROUTE_CONFIG[line_id]
    root = ET.parse(config["path"]).getroot()
    nodes = {
        node.attrib["id"]: (float(node.attrib["lon"]), float(node.attrib["lat"]))
        for node in root.findall("node")
    }
    ways = {
        way.attrib["id"]: [nodes[ref.attrib["ref"]] for ref in way.findall("nd")]
        for way in root.findall("way")
    }
    relation = next(
        relation
        for relation in root.findall("relation")
        if relation.attrib["id"] == config["relationId"]
    )
    stops = [
        nodes[member.attrib["ref"]]
        for member in relation.findall("member")
        if member.attrib.get("type") == "node" and member.attrib.get("role") == "stop"
    ]
    route_parts = [
        ways[member.attrib["ref"]]
        for member in relation.findall("member")
        if member.attrib.get("type") == "way"
    ]
    if not route_parts:
        raise ValueError(f"OSM relation for {line_id} has no route ways")

    first = route_parts[0]
    if squared_distance(first[-1], stops[0]) < squared_distance(first[0], stops[0]):
        first = list(reversed(first))
    stitched = list(first)
    for part in route_parts[1:]:
        if squared_distance(stitched[-1], part[-1]) < squared_distance(stitched[-1], part[0]):
            part = list(reversed(part))
        if stitched[-1] == part[0]:
            stitched.extend(part[1:])
        else:
            stitched.extend(part)
    return stops, [[longitude, latitude] for longitude, latitude in stitched]


def normalize_cmrl() -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    source = (RAW / "cmrl" / "home.html").read_text(errors="replace")
    anchors = station_anchors(source)
    if len(anchors) != 43:
        raise ValueError(f"Expected 43 line/station entries on CMRL home page, found {len(anchors)}")

    memberships = {"cmrl-blue": anchors[:26], "cmrl-green": anchors[26:]}
    routes = {line_id: osm_route(line_id) for line_id in memberships}
    stations: dict[str, dict] = {}
    coordinate_samples: dict[str, list[tuple[float, float]]] = {}
    lines = []
    for line_id, entries in memberships.items():
        stop_coordinates, _ = routes[line_id]
        if len(entries) != len(stop_coordinates):
            raise ValueError(
                f"{line_id} has {len(entries)} official stations but "
                f"{len(stop_coordinates)} OSM stops"
            )
        ordered_ids = []
        for (source_slug, name), coords in zip(entries, stop_coordinates):
            canonical_slug = ALIASES.get(source_slug, source_slug)
            station_id = f"in-maa-cmrl-{canonical_slug}"
            ordered_ids.append(station_id)
            item = stations.setdefault(
                station_id,
                {
                    "id": station_id,
                    "name": name,
                    "operatorId": "in-maa-cmrl",
                    "status": "operational",
                    "sourceUrl": f"https://chennaimetrorail.org/station-information/{source_slug}/",
                    "lineIds": [],
                },
            )
            if line_id not in item["lineIds"]:
                item["lineIds"].append(line_id)
            coordinate_samples.setdefault(station_id, []).append(coords)
        lines.append({"id": line_id, **LINE_CONFIG[line_id], "status": "operational", "stationIds": ordered_ids})

    for station_id, samples in coordinate_samples.items():
        stations[station_id]["longitude"] = sum(point[0] for point in samples) / len(samples)
        stations[station_id]["latitude"] = sum(point[1] for point in samples) / len(samples)

    features = []
    for station in stations.values():
        if "latitude" not in station:
            continue
        features.append(
            {
                "type": "Feature",
                "id": station["id"],
                "geometry": {"type": "Point", "coordinates": [station["longitude"], station["latitude"]]},
                "properties": {key: value for key, value in station.items() if key not in ("longitude", "latitude")},
            }
        )
    route_features = []
    for line_id, (_, geometry) in routes.items():
        short_id = line_id.removeprefix("cmrl-")
        route_features.append(
            {
                "type": "Feature",
                "id": f"{line_id}-route",
                "geometry": {"type": "LineString", "coordinates": geometry},
                "properties": {
                    "id": f"{line_id}-route",
                    "name": LINE_CONFIG[line_id]["name"],
                    "operatorId": "in-maa-cmrl",
                    "status": "operational",
                    "lineIds": [line_id],
                    "line": short_id,
                    "lines": [short_id],
                    "source": "OpenStreetMap contributors",
                    "sourceUrl": OSM_ROUTE_CONFIG[line_id]["sourceUrl"],
                },
            }
        )
    return list(stations.values()), lines, features, route_features


def gtfs_summary() -> dict:
    archive = RAW / "cumta" / "cmrl-gtfs.zip"
    if not archive.exists():
        return {"available": False, "reason": "Official CUMTA feed was not retrievable during this import."}
    with zipfile.ZipFile(archive) as zf:
        files = set(zf.namelist())

        def count_rows(name: str) -> int | None:
            if name not in files:
                return None
            with zf.open(name) as handle:
                return sum(1 for _ in csv.DictReader(io.TextIOWrapper(handle, encoding="utf-8-sig")))

        return {
            "available": True,
            "files": sorted(files),
            "counts": {name[:-4]: count_rows(name) for name in ("agency.txt", "routes.txt", "stops.txt", "trips.txt", "stop_times.txt", "shapes.txt")},
        }


def artifact_report() -> list[dict]:
    artifacts = []
    for path in sorted((RAW / "cmrl").rglob("*.html")):
        relative = path.relative_to(RAW).as_posix()
        if relative == "cmrl/home.html":
            url = "https://chennaimetrorail.org/"
        elif relative == "cmrl/project-status.html":
            url = "https://chennaimetrorail.org/project-status/"
        else:
            url = f"https://chennaimetrorail.org/station-information/{path.stem}/"
        payload = path.read_bytes()
        artifacts.append(
            {
                "path": relative,
                "sourceUrl": url,
                "retrievedAt": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
        )
    pdf_sources = {
        "phase-2-map.pdf": "https://chennaimetrorail.org/wp-content/uploads/2025/03/Phase-II-Map-Updated-Map-PHASE-2.pdf",
        "phase-2-dpr.pdf": "https://chennaimetrorail.org/wp-content/uploads/2025/07/Project-DPR-for-Chennai-Metro-Rail-Phase-II.pdf",
        "timetable.pdf": "https://chennaimetrorail.org/wp-content/uploads/2024/03/chennai-metro-timetable.pdf",
        "frequency-update-2026-01-07.pdf": "https://chennaimetrorail.org/wp-content/uploads/2026/01/Press-Release-07.01.2026-English-1.pdf",
    }
    for path in sorted((RAW / "cmrl").glob("*.pdf")):
        payload = path.read_bytes()
        artifacts.append(
            {
                "path": path.relative_to(RAW).as_posix(),
                "sourceUrl": pdf_sources.get(path.name, "https://chennaimetrorail.org/"),
                "retrievedAt": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
        )
    archive = RAW / "cumta" / "cmrl-gtfs.zip"
    if archive.exists():
        payload = archive.read_bytes()
        artifacts.append(
            {
                "path": archive.relative_to(RAW).as_posix(),
                "sourceUrl": "See data/raw/chennai/manifest.json for the discovered official URL",
                "retrievedAt": datetime.fromtimestamp(archive.stat().st_mtime, timezone.utc).isoformat(),
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
        )
    for path in sorted((RAW / "osm").glob("*.osm")):
        payload = path.read_bytes()
        line_id = "cmrl-blue" if "blue" in path.name else "cmrl-green"
        artifacts.append(
            {
                "path": path.relative_to(RAW).as_posix(),
                "sourceUrl": OSM_ROUTE_CONFIG[line_id]["sourceUrl"],
                "retrievedAt": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
        )
    return artifacts


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    stations, lines, features, route_features = normalize_cmrl()
    generated_at = datetime.now(timezone.utc).isoformat()
    network = {
        "schemaVersion": "0.1.0",
        "region": {"id": "in-maa", "name": "Chennai", "countryCode": "IN", "timezone": "Asia/Kolkata"},
        "operators": [{"id": "in-maa-cmrl", "name": "Chennai Metro Rail Limited", "shortName": "CMRL", "mode": "metro"}],
        "lines": lines,
        "stations": stations,
        "generatedAt": generated_at,
    }
    projects = {
        "schemaVersion": "0.1.0",
        "projects": [
            {
                "id": "in-maa-cmrl-phase-2",
                "name": "Chennai Metro Phase II",
                "status": "under-construction",
                "totalLengthKm": 118.9,
                "stationCount": 128,
                "targetCompletion": "2028-12-31",
                "targetCompletionPrecision": "year",
                "corridors": [
                    {"id": "cmrl-c3", "name": "Madhavaram to SIPCOT", "lengthKm": 45.8, "elevatedKm": 19.1, "undergroundKm": 26.7, "stationCount": 50},
                    {"id": "cmrl-c4", "name": "Lighthouse to Poonamallee Bypass", "lengthKm": 26.1, "elevatedKm": 16.0, "undergroundKm": 10.1, "stationCount": 30},
                    {"id": "cmrl-c5", "name": "Madhavaram to Sholinganallur", "lengthKm": 47.0, "elevatedKm": 41.2, "undergroundKm": 5.8, "stationCount": 48},
                ],
                "sourceUrl": "https://chennaimetrorail.org/project-status/",
                "geometry": None,
                "geometryNote": "No alignment geometry is published here; the official schematic map is not georeferenced and was not traced.",
            }
        ],
        "generatedAt": generated_at,
    }
    quality = {
        "generatedAt": generated_at,
        "operationalStationCount": len(stations),
        "lineStationMembershipCount": sum(len(line["stationIds"]) for line in lines),
        "stationCoordinatesPresent": len(features),
        "stationCoordinatesMissing": len(stations) - len(features),
        "operationalRouteGeometryCount": len(route_features),
        "gtfs": gtfs_summary(),
        "warnings": [
            "Operational station coordinates and railway alignment geometry are derived from OpenStreetMap route relations and attributed under ODbL.",
            "CMRL uses separate URLs for Central and Alandur on each line; these are intentionally merged into stable interchange identities.",
            "No proposed or under-construction alignment geometry is generated from schematic PDFs.",
        ],
    }
    METRO_OUT.mkdir(parents=True, exist_ok=True)
    PROJECTS_OUT.mkdir(parents=True, exist_ok=True)
    METADATA_OUT.mkdir(parents=True, exist_ok=True)
    (METRO_OUT / "network.json").write_text(json.dumps(network, ensure_ascii=False, indent=2) + "\n")
    (METRO_OUT / "stations.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2) + "\n")
    map_features = []
    for feature in features:
        mapped = json.loads(json.dumps(feature))
        line_ids = mapped["properties"].get("lineIds", [])
        mapped["properties"]["line"] = line_ids[0].removeprefix("cmrl-") if line_ids else None
        mapped["properties"]["lines"] = [line_id.removeprefix("cmrl-") for line_id in line_ids]
        map_features.append(mapped)
    map_features.extend(route_features)
    (METRO_OUT / "network.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": map_features}, ensure_ascii=False, indent=2) + "\n"
    )
    (PROJECTS_OUT / "projects.json").write_text(json.dumps(projects, ensure_ascii=False, indent=2) + "\n")
    (METADATA_OUT / "metro-quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n")
    (METADATA_OUT / "import-report.json").write_text(
        json.dumps({"generatedAt": generated_at, "artifacts": artifact_report()}, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"Normalized {len(stations)} stations, {len(lines)} lines, {len(features)} station coordinates")
    print(json.dumps(quality["gtfs"], indent=2))


if __name__ == "__main__":
    main()
