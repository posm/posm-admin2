# POSM Admin II

This is the next generation of POSM Admin. It currently hosts UIs for the [POSM OpenDroneMap
API](https://github.com/mojodna/posm-opendronemap-api) and the [POSM Imagery
API](https://github.com/AmericanRedCross/posm-imagery-api).

## Development

```bash
yarn
yarn start
```

## Building

Edit `config.toml` to set paths and URLs appropriately before running:

```bash
yarn run build
```

This will produce a static site in `public/` that can be distributed alongside API instances.
