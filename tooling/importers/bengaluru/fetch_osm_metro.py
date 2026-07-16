#!/usr/bin/env python3
"""Fetch bounded OSM route relations for operational Namma Metro lines."""

from __future__ import annotations

import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "bengaluru" / "osm"
API = "https://api.openstreetmap.org/api/0.6"
USER_AGENT = "TransitAtlasDataResearch/0.1 (regional importer)"
MAX_RESPONSE_BYTES = 8_000_000

ROUTES = {
    "purple": 1798771,
    "green": 1798772,
    "yellow": 19421927,
}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        length = response.headers.get("Content-Length")
        if length and int(length) > MAX_RESPONSE_BYTES:
            raise ValueError(f"Refusing {length}-byte response from {url}")
        payload = response.read(MAX_RESPONSE_BYTES + 1)
        if len(payload) > MAX_RESPONSE_BYTES:
            raise ValueError(f"Response exceeded {MAX_RESPONSE_BYTES} bytes: {url}")
        return payload


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    artifacts = []
    for line, relation_id in ROUTES.items():
        url = f"{API}/relation/{relation_id}/full.json"
        payload = fetch(url)
        path = RAW / f"{line}-{relation_id}.json"
        path.write_bytes(payload)
        artifacts.append({
            "id": f"osm-namma-metro-{line}",
            "line": line,
            "relationId": relation_id,
            "sourceUrl": f"https://www.openstreetmap.org/relation/{relation_id}",
            "path": path.relative_to(ROOT).as_posix(),
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
        })
        print(f"Fetched {line} relation {relation_id}: {len(payload):,} bytes")

    (RAW / "manifest.json").write_text(json.dumps({
        "schemaVersion": "1.0.0",
        "publisher": "OpenStreetMap contributors",
        "license": "ODbL-1.0",
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "artifacts": artifacts,
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
