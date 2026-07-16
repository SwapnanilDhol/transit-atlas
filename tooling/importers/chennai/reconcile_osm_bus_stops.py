#!/usr/bin/env python3
"""Conservatively reconcile OSM bus-stop points with MTC stage names."""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "chennai" / "osm" / "bus-stops.json"
REGION_OUT = ROOT / "data" / "regions" / "in-maa"
OUT = REGION_OUT / "modes" / "bus"
BUS_NETWORK = OUT / "network.json"
BUS_QUALITY = REGION_OUT / "metadata" / "bus-quality.json"

EXPANSIONS = {
    "bs": "bus stand", "b s": "bus stand", "bt": "bus terminus",
    "r s": "railway station", "rs": "railway station",
    "jn": "junction", "j": "junction", "rd": "road",
    "po": "post office", "p o": "post office", "stn": "station",
    "mkt": "market", "hosp": "hospital", "coll": "college",
}


def ascii_text(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()


def normalize(value: str, expand: bool = False) -> str:
    value = ascii_text(value).lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = " ".join(value.split())
    if expand:
        tokens = value.split()
        expanded: list[str] = []
        index = 0
        while index < len(tokens):
            pair = " ".join(tokens[index:index + 2])
            if pair in EXPANSIONS:
                expanded.extend(EXPANSIONS[pair].split())
                index += 2
            else:
                expanded.extend(EXPANSIONS.get(tokens[index], tokens[index]).split())
                index += 1
        value = " ".join(expanded)
    return value


def osm_name(tags: dict) -> str | None:
    for key in ("name:en", "name", "official_name", "alt_name", "local_ref", "ref"):
        value = tags.get(key)
        if value and any(character.isalpha() for character in value):
            return value.strip()
    return None


def main() -> None:
    if not RAW.exists() or not BUS_NETWORK.exists():
        raise SystemExit("Run fetch_osm_bus_stops.py and normalize_mtc_bus.py first")
    raw = json.loads(RAW.read_text())
    network = json.loads(BUS_NETWORK.read_text())
    mtc_stops = network["stops"]

    exact_index: dict[str, list[dict]] = defaultdict(list)
    expanded_index: dict[str, list[dict]] = defaultdict(list)
    for stop in mtc_stops:
        exact_index[normalize(stop["name"])].append(stop)
        expanded_index[normalize(stop["name"], expand=True)].append(stop)

    osm_to_matches: dict[int, tuple[list[dict], str, float]] = {}
    method_counts: dict[str, int] = defaultdict(int)
    named_nodes = []
    for node in raw.get("elements", []):
        if node.get("type") != "node" or "lat" not in node or "lon" not in node:
            continue
        name = osm_name(node.get("tags", {}))
        if not name:
            continue
        named_nodes.append((node, name))
        basic = normalize(name)
        expanded = normalize(name, expand=True)
        matches = exact_index.get(basic, [])
        method = "exact-name"
        confidence = 1.0
        if not matches:
            matches = expanded_index.get(expanded, [])
            method = "normalized-alias"
            confidence = 0.97
        if not matches and len(expanded) >= 6:
            candidates = [
                (SequenceMatcher(None, expanded, candidate_name).ratio(), stops)
                for candidate_name, stops in expanded_index.items()
                if candidate_name[:1] == expanded[:1] and abs(len(candidate_name) - len(expanded)) <= 8
            ]
            candidates.sort(key=lambda item: item[0], reverse=True)
            best_score = candidates[0][0] if candidates else 0
            second_score = candidates[1][0] if len(candidates) > 1 else 0
            if best_score >= 0.93 and best_score - second_score >= 0.035:
                matches = candidates[0][1]
                method = "high-confidence-fuzzy-name"
                confidence = round(best_score, 3)
        if matches:
            osm_to_matches[node["id"]] = (matches, method, confidence)
            method_counts[method] += 1

    osm_points_by_mtc: dict[str, list[dict]] = defaultdict(list)
    features = []
    for node, name in named_nodes:
        matches, method, confidence = osm_to_matches.get(node["id"], ([], "unmatched", 0.0))
        route_ids = sorted({route_id for stop in matches for route_id in stop["routeIds"]})
        for stop in matches:
            osm_points_by_mtc[stop["id"]].append(node)
        tags = node.get("tags", {})
        features.append({
            "type": "Feature",
            "id": f"osm-node-{node['id']}",
            "properties": {
                "id": f"osm-node-{node['id']}",
                "name": name,
                "osmNodeId": node["id"],
                "operator": tags.get("operator"),
                "network": tags.get("network"),
                "matchedStopIds": [stop["id"] for stop in matches],
                "routeIds": route_ids,
                "matchMethod": method,
                "matchConfidence": confidence,
                "sourceUrl": f"https://www.openstreetmap.org/node/{node['id']}",
            },
            "geometry": {"type": "Point", "coordinates": [node["lon"], node["lat"]]},
        })

    for stop in mtc_stops:
        points = osm_points_by_mtc.get(stop["id"], [])
        if points:
            stop["location"] = {
                "latitude": sum(point["lat"] for point in points) / len(points),
                "longitude": sum(point["lon"] for point in points) / len(points),
            }
            stop["locationSource"] = "openstreetmap-name-reconciliation"
            stop["osmNodeIds"] = [point["id"] for point in points]

    generated_at = datetime.now(timezone.utc).isoformat()
    network["generatedAt"] = generated_at
    network["coordinateSource"] = {
        "name": "OpenStreetMap",
        "license": "ODbL-1.0",
        "url": "https://www.openstreetmap.org/copyright",
        "method": "Conservative name reconciliation; unmatched and ambiguous MTC stages remain unlocated.",
    }
    geojson = {
        "type": "FeatureCollection",
        "name": "Chennai OSM bus stops",
        "attribution": "© OpenStreetMap contributors, ODbL 1.0",
        "features": features,
    }
    matched_mtc_ids = set(osm_points_by_mtc)
    report = {
        "schemaVersion": "0.1.0",
        "generatedAt": generated_at,
        "osmNamedStopCount": len(named_nodes),
        "osmMatchedFeatureCount": len(osm_to_matches),
        "osmUnmatchedFeatureCount": len(named_nodes) - len(osm_to_matches),
        "mtcStopCount": len(mtc_stops),
        "mtcMatchedStopCount": len(matched_mtc_ids),
        "mtcUnmatchedStopCount": len(mtc_stops) - len(matched_mtc_ids),
        "matchMethodCounts": dict(sorted(method_counts.items())),
        "minimumFuzzyConfidence": 0.93,
        "notes": [
            "All named OSM bus-stop points are plotted; only conservative matches are associated with MTC routes.",
            "Multiple OSM platform nodes may correspond to one direction-agnostic MTC stage.",
            "An official GTFS feed should supersede name reconciliation when available.",
        ],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "stops.geojson").write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")) + "\n")
    (OUT / "stop-matches.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    BUS_NETWORK.write_text(json.dumps(network, ensure_ascii=False, indent=2) + "\n")
    if BUS_QUALITY.exists():
        quality = json.loads(BUS_QUALITY.read_text())
        located_route_count = sum(
            any(stop_id in matched_mtc_ids for stop_id in route["orderedStopIds"])
            for route in network["routes"]
        )
        quality.update({
            "generatedAt": generated_at,
            "osmNamedStopPointCount": len(named_nodes),
            "osmMatchedFeatureCount": len(osm_to_matches),
            "stopsWithCoordinates": len(matched_mtc_ids),
            "stopsWithoutCoordinates": len(mtc_stops) - len(matched_mtc_ids),
            "routesWithAtLeastOneMappedStop": located_route_count,
            "routesWithoutCoordinates": len(network["routes"]) - located_route_count,
        })
        quality["warnings"] = [
            "MTC route pages provide ordered stage names but no coordinates, shapes, trip calendars, or departure times.",
            "OSM stop points are independently sourced; only conservative name matches are linked to MTC stages.",
            "Unmatched points remain visible as OSM stops but are not associated with an MTC route.",
            "CUMTA's preferred static GTFS portal was DNS-unreachable during this import; verified GTFS should supersede this reconciliation.",
        ]
        BUS_QUALITY.write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n")
    print(
        f"Plotted {len(features)} named OSM stops; matched {len(osm_to_matches)} OSM features "
        f"to {len(matched_mtc_ids)}/{len(mtc_stops)} MTC stages"
    )


if __name__ == "__main__":
    main()
