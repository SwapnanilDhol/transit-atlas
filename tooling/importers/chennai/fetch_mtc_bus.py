#!/usr/bin/env python3
"""Fetch MTC's official route index and ordered stage pages.

The preferred source is CUMTA's static GTFS repository. When that host is not
resolvable, this script captures the current route/stage facts published by MTC
itself. Raw responses are ignored by Git; the manifest makes every download
auditable and reproducible.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "chennai" / "mtc"
INDEX_URL = "https://mtcbus.tn.gov.in/Home/routewiseinfo"
USER_AGENT = "public-transit-atlas/0.1 (source importer; contact repository owner)"
MAX_RESPONSE_BYTES = 2_000_000


def fetch(url: str, retries: int = 3) -> tuple[bytes, dict[str, str]]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(
                request, timeout=30, context=ssl.create_default_context()
            ) as response:
                length = response.headers.get("Content-Length")
                if length and int(length) > MAX_RESPONSE_BYTES:
                    raise ValueError(f"Refusing {length}-byte response from {url}")
                payload = response.read(MAX_RESPONSE_BYTES + 1)
                if len(payload) > MAX_RESPONSE_BYTES:
                    raise ValueError(f"Response exceeded {MAX_RESPONSE_BYTES} bytes: {url}")
                return payload, {
                    key.lower(): value for key, value in response.headers.items()
                }
        except (OSError, urllib.error.URLError):
            if attempt == retries - 1:
                raise
            time.sleep(0.5 * (2**attempt))
    raise RuntimeError("unreachable")


def route_ids(index_html: str) -> list[str]:
    select = re.search(
        r'<select[^>]+id="selroute"[^>]*>(.*?)</select>', index_html, re.S | re.I
    )
    if not select:
        raise ValueError("MTC route selector was not found")
    values = re.findall(r'<option\s+value="([^"]+)"', select.group(1), re.I)
    return [html.unescape(value).strip() for value in values if value != "1"]


def artifact(source_id: str, url: str, path: Path, payload: bytes, headers: dict) -> dict:
    return {
        "id": source_id,
        "sourceUrl": url,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "path": path.relative_to(RAW.parent).as_posix(),
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "contentType": headers.get("content-type"),
        "lastModified": headers.get("last-modified"),
        "etag": headers.get("etag"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int, help="Fetch only the first N routes")
    args = parser.parse_args()
    if not 1 <= args.workers <= 8:
        parser.error("--workers must be between 1 and 8")

    RAW.mkdir(parents=True, exist_ok=True)
    index_payload, index_headers = fetch(INDEX_URL)
    index_path = RAW / "route-index.html"
    index_path.write_bytes(index_payload)
    artifacts = [artifact("mtc-route-index", INDEX_URL, index_path, index_payload, index_headers)]
    routes = route_ids(index_payload.decode("utf-8", errors="replace"))
    if args.limit is not None:
        routes = routes[: args.limit]

    failures: list[dict[str, str]] = []

    def fetch_route(route_id: str) -> dict:
        query = urllib.parse.urlencode({"selroute": route_id, "submit": ""})
        url = f"{INDEX_URL}?{query}"
        payload, headers = fetch(url)
        filename = urllib.parse.quote(route_id, safe="") + ".html"
        path = RAW / "routes" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        return artifact(f"mtc-route-{route_id}", url, path, payload, headers)

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(fetch_route, route_id): route_id for route_id in routes}
        for completed, future in enumerate(as_completed(futures), start=1):
            route_id = futures[future]
            try:
                artifacts.append(future.result())
            except (OSError, urllib.error.URLError, ValueError) as error:
                failures.append({"routeId": route_id, "error": str(error)})
            if completed % 100 == 0:
                print(f"Fetched {completed}/{len(routes)} route pages")

    manifest = {
        "schemaVersion": "0.1.0",
        "publisher": "Metropolitan Transport Corporation (Chennai) Ltd",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "expectedRouteCount": len(routes),
        "artifacts": sorted(artifacts, key=lambda item: item["id"]),
        "failures": failures,
    }
    (RAW / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"Fetched {len(artifacts) - 1}/{len(routes)} route pages; {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
