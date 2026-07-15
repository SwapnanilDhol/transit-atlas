# Transit Atlas web

The map-first Next.js client for Transit Atlas. It uses Tailwind CSS, Motion,
MapLibre, and the shared `@transit-atlas/domain` package.

From the repository root:

```bash
npm install
npm run data:sync
npm run dev
```

The Chennai regional bundle is generated in `data/regions/in-maa` and copied
into `public/data/in-maa` for immutable browser delivery.

This app uses the Sites-compatible vinext runtime and keeps optional D1/Drizzle
scaffolding available for future server-side product capabilities.
