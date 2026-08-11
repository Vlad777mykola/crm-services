# scripts

Standalone developer tooling that isn't part of any deployable service. Each
subfolder is its own small package with its own `package.json` - run its `yarn
install` once, then use its own scripts.

## Available scripts

- [`fill_dump_db/`](fill_dump_db/README.md) - seeds the main Postgres database with fake
  data covering every status/enum value across every table, plus a fixed set of test
  login credentials (same password for all, listed in that folder's README).
