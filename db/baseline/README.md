# Team baseline

Sanitized, versioned team database artifact. Metadata is committed; the binary dump is local or pulled.

```powershell
yarn db:baseline:pull
yarn db:baseline:info
yarn db:baseline:restore --target dev
yarn db:baseline:create
```

Publish workflow: after `baseline:create`, upload `dev-baseline-v{N}-{commit}.dump` to artifact storage and update `manifest.json` with `artifactUrl` and checksum.
