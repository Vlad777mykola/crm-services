import { createDataSource } from './data-source.js';

type Command = 'run' | 'revert' | 'status';

const SCHEMA_NAME = 'specialists_schema';

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  if (!command || !['run', 'revert', 'status'].includes(command)) {
    throw new Error('Usage: tsx src/db/migration-runner.ts <run|revert|status>');
  }

  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA_NAME}`);

    if (command === 'run') {
      const migrations = await dataSource.runMigrations();
      console.log(`[specialists-service] applied ${migrations.length} migration(s)`);
      return;
    }

    if (command === 'revert') {
      await dataSource.undoLastMigration();
      console.log('[specialists-service] reverted last migration');
      return;
    }

    const pending = await dataSource.showMigrations();
    console.log(`[specialists-service] pending migrations: ${pending ? 'yes' : 'no'}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error('[specialists-service] migration command failed:', err);
  process.exitCode = 1;
});
