#!/usr/bin/env python3
"""Fetch reusable Chennai bus-stop points from OpenStreetMap via Overpass."""

from __future__ import annotations

import hashlib
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "chennai" / "osm"
OUT = RAW / "bus-stops.json"
MANIFEST = RAW / "bus-stops-manifest.json"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "TransitAtlasDataResearch/0.1 (OpenStreetMap importer)"
MAX_RESPONSE_BYTES = 12_000_000

# Broad Chennai metropolitan-area bounds: south, west, north, east.
BBOX = (12.75, 79.95, 13.35, 80.40)


def main() -> None:
    south, west, north, east = BBOX
    bbox = f"{south},{west},{north},{east}"
    query = f'''[out:json][timeout:60];
(
  node["highway"="bus_stop"]({bbox});
  node["public_transport"="platform"]["bus"="yes"]({bbox});
  node["public_transport"="stop_position"]["bus"="yes"]({bbox});
);
out body;'''
    request = urllib.request.Request(
        OVERPASS_URL,
        data=urllib.parse.urlencode({"data": query}).encode(),
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        length = response.headers.get("Content-Length")
        if length and int(length) > MAX_RESPONSE_BYTES:
            raise ValueError(f"Refusing {length}-byte Overpass response")
        payload = response.read(MAX_RESPONSE_BYTES + 1)
        if len(payload) > MAX_RESPONSE_BYTES:
            raise ValueError("Overpass response exceeded safety limit")

    parsed = json.loads(payload)
    nodes = [item for item in parsed.get("elements", []) if item.get("type") == "node"]
    generated_at = datetime.now(timezone.utc).isoformat()
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(payload)
    MANIFEST.write_text(json.dumps({
        "schemaVersion": "0.1.0",
        "source": "OpenStreetMap via Overpass API",
        "sourceUrl": OVERPASS_URL,
        "license": "ODbL-1.0",
        "licenseUrl": "https://www.openstreetmap.org/copyright",
        "retrievedAt": generated_at,
        "boundingBox": {"south": south, "west": west, "north": north, "east": east},
        "nodeCount": len(nodes),
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }, indent=2) + "\n")
    print(f"Fetched {len(nodes)} OSM bus-stop nodes ({len(payload):,} bytes)")


if __name__ == "__main__":
    main()
