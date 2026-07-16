# Transit Atlas

An open, source-aware atlas for exploring public transport networks around the world.

**Live app:** [transit-atlas.vercel.app](https://transit-atlas.vercel.app)

Transit Atlas begins with Chennai and Bengaluru, but the repository is organized around portable regional bundles rather than city-specific application logic. Each city declares its capabilities, datasets, sources, quality reports, and transport modes through a versioned manifest.

## What works today

- Interactive MapLibre maps for Chennai Metro, Bengaluru Namma Metro, and mapped MTC bus stops
- Switchable Chennai and Bengaluru regional contexts
- Operational Bengaluru Purple, Green, and Yellow lines with 84 mapped stations
- Operational and future Chennai Metro lines
- Searchable station and MTC route directories
- Readable CMRL weekday, Saturday, and Sunday/holiday timetables
- 686 MTC routes and 1,538 normalized stages
- 1,215 reusable OpenStreetMap bus-stop points with conservative MTC matching
- Light desktop sidebar and mobile bottom-sheet layouts
- Shared TypeScript/Zod transit domain models
- Reproducible, source-attributed importers with bounded downloads

No feature is labelled live unless an actual realtime source exists. The app does not synthesize vehicle positions or trace schematic maps into false geographic precision.

## Repository layout

```text
apps/web/                  Next.js application
packages/domain/           Framework-neutral schemas and types
data/regions/<region-id>/  Versioned regional bundles
data/templates/            Starter files for new regions
tooling/importers/         Source-specific fetch and normalization tools
tooling/validate-regions.mjs
docs/                      Architecture and data documentation
```

Every regional bundle starts with `region.json` and `manifest.json`. See [the regional data contract](docs/data-contract.md).

## Run locally

Requirements: Node.js 22.13 or newer and Python 3.11 or newer for importers.

```bash
npm install
npm run data:validate
npm run data:sync
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development command has a 1.5 GB Node heap cap and uses the Webpack dev server to prevent runaway compiler memory usage observed with an earlier local configuration.

## Deploy

The repository includes a root `vercel.json` for its npm-workspace layout. After authenticating with Vercel CLI:

```bash
vercel link --project transit-atlas
vercel deploy --prod
```

## Validate changes

```bash
npm run check
npm test
```

`npm run check` validates every regional manifest, checks the shared domain package, and lints the web application.

## Add your city

City contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and copy the examples in [`data/templates/region`](data/templates/region). A contribution may begin at the catalog tier; it does not need realtime data or complete route geometry.

Preferred sources, in order:

1. Official agency or transport-authority open data
2. Official government open-data portals
3. Standard feeds such as GTFS, GTFS-Realtime, NeTEx, SIRI, or GBFS
4. OpenStreetMap under ODbL for compatible geographic facts
5. Clearly attributed official reports for future projects

Do not scrape Google Maps or submit data that cannot legally be redistributed.

## Data integrity

- Source URLs, licenses, timestamps, and uncertainty are first-class metadata.
- Raw downloads are ignored by Git; committed outputs must be normalized and redistributable.
- Schedule data and realtime observations remain separate.
- Proposed infrastructure never enters operational routing data.
- Incomplete coverage is reported rather than silently inferred.

Regional sources and limitations are documented in [docs/chennai-data.md](docs/chennai-data.md), [docs/chennai-service-data.md](docs/chennai-service-data.md), and [docs/bengaluru-data.md](docs/bengaluru-data.md).

## License

Source code is available under the [MIT License](LICENSE). Dataset rights vary by source; consult [DATA_LICENSES.md](DATA_LICENSES.md) and each region's source registry before reusing data.
