#!/usr/bin/env python3
"""Normalize MTC's official ordered route-stage pages."""

from __future__ import annotations

import hashlib
import html
import json
import re
import unicodedata
import urllib.parse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "chennai" / "mtc"
REGION_OUT = ROOT / "data" / "regions" / "in-maa"
OUT = REGION_OUT / "modes" / "bus"
METADATA_OUT = REGION_OUT / "metadata"
SOURCE_URL = "https://mtcbus.tn.gov.in/Home/routewiseinfo"


def clean_text(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", " ", value))
    return " ".join(value.split())


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    result = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    if result:
        return result
    return hashlib.sha1(value.encode()).hexdigest()[:12]


def route_slug(value: str) -> str:
    """Keep familiar route IDs readable while preserving punctuation variants."""
    base = slug(value)
    if re.fullmatch(r"[A-Za-z0-9]+", value):
        return base
    return f"{base}-{hashlib.sha1(value.encode()).hexdigest()[:6]}"


def parse_route(path: Path) -> dict:
    source = path.read_text(errors="replace")
    route_id = urllib.parse.unquote(path.stem)
    route_list = re.search(r'<ul\s+class="route"[^>]*>(.*?)</ul>', source, re.S | re.I)
    if not route_list:
        raise ValueError(f"No ordered stages found for route {route_id}")
    stops = [
        clean_text(value)
        for value in re.findall(
            r"<li[^>]*>\s*<span[^>]*>\d+</span>(.*?)</li>",
            route_list.group(1),
            re.S | re.I,
        )
    ]
    stops = [value for value in stops if value]
    if len(stops) < 2:
        raise ValueError(f"Route {route_id} has fewer than two stages")
    return {
        "id": f"in-maa-mtc-route-{route_slug(route_id)}",
        "shortName": route_id,
        "name": f"{stops[0]} – {stops[-1]}",
        "agencyId": "in-maa-mtc",
        "regionId": "in-maa",
        "mode": "bus",
        "status": "operational",
        "originStopId": f"in-maa-mtc-stop-{slug(stops[0])}",
        "destinationStopId": f"in-maa-mtc-stop-{slug(stops[-1])}",
        "orderedStopIds": [f"in-maa-mtc-stop-{slug(stop)}" for stop in stops],
        "sourceUrl": f"{SOURCE_URL}?{urllib.parse.urlencode({'selroute': route_id, 'submit': ''})}",
    }


def main() -> None:
    paths = sorted((RAW / "routes").glob("*.html"))
    if not paths:
        raise SystemExit("No raw MTC route pages found; run fetch_mtc_bus.py first")

    routes: list[dict] = []
    errors: list[dict] = []
    for path in paths:
        try:
            routes.append(parse_route(path))
        except ValueError as error:
            errors.append({"path": path.relative_to(ROOT).as_posix(), "error": str(error)})

    stop_names: dict[str, str] = {}
    route_memberships: dict[str, set[str]] = {}
    for route in routes:
        source = (RAW / "routes" / (urllib.parse.quote(route["shortName"], safe="") + ".html")).read_text(errors="replace")
        section = re.search(r'<ul\s+class="route"[^>]*>(.*?)</ul>', source, re.S | re.I)
        names = [clean_text(value) for value in re.findall(r"<li[^>]*>\s*<span[^>]*>\d+</span>(.*?)</li>", section.group(1), re.S | re.I)]
        for stop_id, name in zip(route["orderedStopIds"], names):
            stop_names.setdefault(stop_id, name)
            route_memberships.setdefault(stop_id, set()).add(route["id"])

    stops = [
        {
            "id": stop_id,
            "name": name,
            "agencyId": "in-maa-mtc",
            "regionId": "in-maa",
            "kind": "stop",
            "status": "operational",
            "routeIds": sorted(route_memberships[stop_id]),
            "location": None,
        }
        for stop_id, name in sorted(stop_names.items(), key=lambda item: item[1])
    ]
    generated_at = datetime.now(timezone.utc).isoformat()
    update_dates = []
    for path in paths[:1] + [RAW / "route-index.html"]:
        if path.exists():
            match = re.search(r"Updated on\s+(\d{2}-\d{2}-\d{4})", path.read_text(errors="replace"))
            if match:
                day, month, year = match.group(1).split("-")
                update_dates.append(f"{year}-{month}-{day}")

    dataset = {
        "schemaVersion": "0.1.0",
        "region": {"id": "in-maa", "name": "Chennai", "countryCode": "IN", "timezone": "Asia/Kolkata"},
        "operator": {"id": "in-maa-mtc", "name": "Metropolitan Transport Corporation (Chennai) Ltd", "shortName": "MTC", "mode": "bus"},
        "routes": sorted(routes, key=lambda route: route["shortName"]),
        "stops": stops,
        "sourceUpdatedAt": max(update_dates) if update_dates else None,
        "generatedAt": generated_at,
    }
    quality = {
        "schemaVersion": "0.1.0",
        "generatedAt": generated_at,
        "status": "passed-with-warnings" if routes else "failed",
        "routeCount": len(routes),
        "uniqueStopCount": len(stops),
        "routeStopMembershipCount": sum(len(route["orderedStopIds"]) for route in routes),
        "routesWithoutCoordinates": len(routes),
        "stopsWithoutCoordinates": len(stops),
        "minimumStagesPerRoute": min((len(route["orderedStopIds"]) for route in routes), default=0),
        "maximumStagesPerRoute": max((len(route["orderedStopIds"]) for route in routes), default=0),
        "duplicateRouteIdCount": len(routes) - len({route["id"] for route in routes}),
        "parseErrors": errors,
        "warnings": [
            "MTC route pages provide ordered stage names but no stop coordinates, shapes, trip calendars, or departure times.",
            "Stop identity is normalized from the published stage name; spelling variants may represent the same physical stop.",
            "CUMTA's preferred static GTFS portal was DNS-unreachable during this import, so this is a static route directory rather than a schedulable GTFS feed.",
        ],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    METADATA_OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "network.json").write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n")
    (METADATA_OUT / "bus-quality.json").write_text(json.dumps(quality, ensure_ascii=False, indent=2) + "\n")
    print(
        f"Normalized {len(routes)} bus routes, {len(stops)} named stages, "
        f"{quality['routeStopMembershipCount']} memberships; {len(errors)} errors"
    )


if __name__ == "__main__":
    main()
