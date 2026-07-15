#!/usr/bin/env python3
"""Fetch official Chennai Metro source material into data/raw/chennai.

The CUMTA portal currently advertises GTFS downloads but does not publish a
stable direct URL in its indexed metadata. This importer discovers ZIP links
from the official portal at run time, or accepts an explicitly verified URL.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data" / "raw" / "chennai"
USER_AGENT = "public-transit-atlas/0.1 (source importer; contact repository owner)"

SOURCES = {
    "cmrl_home": "https://chennaimetrorail.org/",
    "cmrl_project_status": "https://chennaimetrorail.org/project-status/",
    "cmrl_phase_2_map": "https://chennaimetrorail.org/wp-content/uploads/2025/03/Phase-II-Map-Updated-Map-PHASE-2.pdf",
    "cmrl_phase_2_dpr": "https://chennaimetrorail.org/wp-content/uploads/2025/07/Project-DPR-for-Chennai-Metro-Rail-Phase-II.pdf",
}
CUMTA_PORTAL = "https://opendata.cumta.org/"


def fetch_bytes(url: str, timeout: int = 45) -> tuple[bytes, dict[str, str]]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
        return response.read(), {key.lower(): value for key, value in response.headers.items()}


def save(name: str, url: str, relative_path: str, manifest: list[dict]) -> bytes:
    payload, headers = fetch_bytes(url)
    destination = RAW / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(payload)
    manifest.append(
        {
            "id": name,
            "sourceUrl": url,
            "retrievedAt": datetime.now(timezone.utc).isoformat(),
            "path": relative_path,
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "contentType": headers.get("content-type"),
            "lastModified": headers.get("last-modified"),
            "etag": headers.get("etag"),
        }
    )
    return payload


def station_urls(home_html: str) -> list[str]:
    urls = re.findall(r'href=["\'](https://chennaimetrorail\.org/station-information/[^"\']+)', home_html)
    return list(dict.fromkeys(urls))


def discover_gtfs_url() -> str | None:
    candidates: list[str] = []
    for page_url in (CUMTA_PORTAL, urllib.parse.urljoin(CUMTA_PORTAL, "datasets"), urllib.parse.urljoin(CUMTA_PORTAL, "datasets/")):
        try:
            payload, _ = fetch_bytes(page_url, timeout=20)
        except (OSError, urllib.error.URLError):
            continue
        html = payload.decode("utf-8", errors="replace")
        for href in re.findall(r'href=["\']([^"\']+\.zip(?:\?[^"\']*)?)', html, flags=re.I):
            absolute = urllib.parse.urljoin(page_url, href)
            if any(token in absolute.lower() for token in ("metro", "cmrl")):
                candidates.append(absolute)
    return candidates[0] if candidates else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-pdfs", action="store_true", help="Fetch only HTML, station pages, and GTFS")
    parser.add_argument("--skip-stations", action="store_true", help="Do not fetch individual station pages")
    parser.add_argument("--gtfs-url", help="Verified official CUMTA Metro GTFS ZIP URL")
    parser.add_argument("--require-gtfs", action="store_true", help="Fail when the official GTFS cannot be discovered")
    args = parser.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    manifest: list[dict] = []
    try:
        home = save("cmrl_home", SOURCES["cmrl_home"], "cmrl/home.html", manifest)
        save("cmrl_project_status", SOURCES["cmrl_project_status"], "cmrl/project-status.html", manifest)
        if not args.skip_pdfs:
            save("cmrl_phase_2_map", SOURCES["cmrl_phase_2_map"], "cmrl/phase-2-map.pdf", manifest)
            save("cmrl_phase_2_dpr", SOURCES["cmrl_phase_2_dpr"], "cmrl/phase-2-dpr.pdf", manifest)
        if not args.skip_stations:
            urls = station_urls(home.decode("utf-8", errors="replace"))

            def fetch_station(url: str) -> None:
                slug = urllib.parse.urlparse(url).path.rstrip("/").split("/")[-1]
                save(f"cmrl_station_{slug}", url, f"cmrl/stations/{slug}.html", manifest)
            failures = []
            with ThreadPoolExecutor(max_workers=8) as pool:
                futures = {pool.submit(fetch_station, url): url for url in urls}
                for future in as_completed(futures):
                    try:
                        future.result()
                    except (OSError, urllib.error.URLError) as error:
                        failures.append(f"{futures[future]}: {error}")
            if failures:
                print("Station page fetch failures:\n" + "\n".join(failures), file=sys.stderr)
                return 1
    except (OSError, urllib.error.URLError) as error:
        print(f"CMRL fetch failed: {error}", file=sys.stderr)
        return 1

    gtfs_url = args.gtfs_url or discover_gtfs_url()
    if gtfs_url:
        try:
            save("cumta_cmrl_gtfs", gtfs_url, "cumta/cmrl-gtfs.zip", manifest)
        except (OSError, urllib.error.URLError) as error:
            print(f"Official GTFS fetch failed: {error}", file=sys.stderr)
            if args.require_gtfs:
                return 2
    else:
        print(
            "CUMTA Metro GTFS URL was not discoverable. The portal host may be unavailable; "
            "retry later or pass --gtfs-url after verifying an official portal link.",
            file=sys.stderr,
        )
        if args.require_gtfs:
            return 2

    (RAW / "manifest.json").write_text(json.dumps({"artifacts": manifest}, indent=2) + "\n")
    print(f"Fetched {len(manifest)} artifacts; manifest: {RAW / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
