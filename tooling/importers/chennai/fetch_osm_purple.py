#!/usr/bin/env python3
"""Fetch the OSM under-construction Chennai Metro Corridor 3 relation."""

from __future__ import annotations

import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DESTINATION = ROOT / "data/raw/chennai/osm/purple-12824257.json"
MANIFEST = ROOT / "data/raw/chennai/osm/purple-12824257.manifest.json"
URL = "https://api.openstreetmap.org/api/0.6/relation/12824257/full.json"
MAX_BYTES = 8 * 1024 * 1024


def main() -> None:
    request = urllib.request.Request(
        URL,
        headers={"User-Agent": "TransitAtlas/0.1 (github.com/SwapnanilDhol/transit-atlas)"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read(MAX_BYTES + 1)
        content_type = response.headers.get("content-type")
    if len(payload) > MAX_BYTES:
        raise ValueError("OSM response exceeded the 8 MB importer limit")
    parsed = json.loads(payload)
    if not any(element.get("type") == "relation" and element.get("id") == 12824257 for element in parsed["elements"]):
        raise ValueError("OSM response did not contain relation 12824257")

    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_bytes(payload)
    MANIFEST.write_text(
        json.dumps(
            {
                "sourceUrl": URL,
                "retrievedAt": datetime.now(timezone.utc).isoformat(),
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
                "contentType": content_type,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"Fetched OSM Corridor 3 relation: {len(payload):,} bytes")


if __name__ == "__main__":
    main()
