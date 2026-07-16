# Transit Atlas web app

The Next.js client renders normalized regional bundles from `public/data/`.
Do not edit generated public data directly; update `data/regions/` and run:

```bash
npm run data:validate
npm run data:sync
npm run dev
```

The development script uses Webpack and caps the Node heap at 1.5 GB as a local
safeguard. Regional data contracts and contribution guidance live at the
repository root.
