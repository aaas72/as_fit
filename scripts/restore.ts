/**
 * Cross-platform PostgreSQL restore script (Linux / macOS / Windows).
 * Replaces current database contents with the specified custom-format dump.
 * Usage: pnpm db:restore backups/asfit_YYYYMMDD_HHmm.dump [--yes]
 */
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { buildPgRestoreCommands, parseRestoreArgs, resolveDbContainerConfig } from './db-backup-lib';

async function confirmRestore(dbName: string, dumpPath: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(
      `⚠️  This will overwrite ALL current data in database "${dbName}" with "${dumpPath}".\nType "yes" to continue: `,
    );
    return answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

async function main() {
  const { dumpFilePath, autoConfirm } = parseRestoreArgs(process.argv.slice(2));
  const cfg = resolveDbContainerConfig();

  if (!autoConfirm) {
    const proceed = await confirmRestore(cfg.dbName, dumpFilePath);
    if (!proceed) {
      console.log('Restore cancelled.');
      process.exit(0);
    }
  }

  const { copyInArgs, restoreArgs, cleanupArgs } = buildPgRestoreCommands(cfg, dumpFilePath);

  execFileSync('docker', copyInArgs, { stdio: 'inherit' });
  try {
    execFileSync('docker', restoreArgs, { stdio: 'inherit' });
  } finally {
    execFileSync('docker', cleanupArgs, { stdio: 'ignore' });
  }

  console.log(`✅ Restored database "${cfg.dbName}" from ${dumpFilePath}`);
}

main().catch((err: unknown) => {
  console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
