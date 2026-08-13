# Personal database backups

Private `pg_dump` custom-format snapshots (`*.dump`). **Never commit.**

```powershell
yarn db:backup --target dev
yarn db:backup --target dev --name before-refactor
yarn db:backup:list
```

Auto-backup before restore: `{target}-auto-before-restore-{timestamp}.dump`
