# Transit Atlas

A living, source-aware atlas for public transport networks around the world. Chennai Metro is the first reference region; the platform model is designed to grow from one city to thousands without baking city-specific assumptions into the product.

## Workspace

```text
apps/web                Next.js web application
packages/domain         Framework-neutral transit schemas and types
data/regions/in-maa     Normalized Chennai regional bundle
data/raw/chennai        Reproducible local source cache (ignored by Git)
tooling/importers       Data acquisition and normalization tools
docs                    Product, platform, and data documentation
```

## Start the web app

```bash
npm install
npm run dev
```

The web app runs at [http://localhost:3000](http://localhost:3000).

## Validate the workspace

```bash
npm run check
npm test
```

## Principles

- Standards-first ingestion: GTFS, GTFS-Realtime, GBFS, GeoJSON, and explicit adapters.
- Stable internal identities rather than permanent reliance on upstream feed IDs.
- Provenance, licensing, freshness, and certainty are first-class data.
- Immutable, region-versioned publishing and last-known-good rollback.
- Shared domain and API contracts for web and mobile, with platform-native interfaces.
- Capability-driven UI: never imply that live, accessible, or proposed data is more complete than its sources support.

See [the platform plan](docs/platform-plan.md) for the full product and architecture blueprint.
