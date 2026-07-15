# Chennai importer

Run from the repository root:

```sh
python3 tooling/importers/chennai/fetch.py
python3 tooling/importers/chennai/normalize.py
```

Raw HTML, PDF, GTFS, and retrieval manifests live under `data/raw/chennai/`
and are intentionally ignored by Git. To require GTFS in automation, use
`--require-gtfs`. If CUMTA changes its page structure, pass a direct URL only
after verifying that it is an official `opendata.cumta.org` download:

```sh
python3 tooling/importers/chennai/fetch.py \
  --gtfs-url 'https://opendata.cumta.org/path/from-the-official-datasets-page.zip' \
  --require-gtfs
```

