# POSM Admin II

**DEPRECATED**: components have been incorporated into
[posm-admin-ui](https://github.com/posm/posm-admin-ui).

This is the version POSM Admin that hosts UIs for the [POSM OpenDroneMap
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
