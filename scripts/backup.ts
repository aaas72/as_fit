/**
 * Cross-platform PostgreSQL backup script (Linux / macOS / Windows).
 * Usage: pnpm db:backup
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildPgDumpCommands, formatBackupStamp, resolveDbContainerConfig } from './db-backup-lib';

function main() {
  const cfg = resolveDbContainerConfig();
  const stamp = formatBackupStamp();
  mkdirSync('backups', { recursive: true });
  const outputPath = join('backups', `asfit_${stamp}.dump`);

  const { dumpArgs, copyOutArgs, cleanupArgs } = buildPgDumpCommands(cfg, outputPath);

  execFileSync('docker', dumpArgs, { stdio: 'inherit' });
  try {
    execFileSync('docker', copyOutArgs, { stdio: 'inherit' });
  } finally {
    execFileSync('docker', cleanupArgs, { stdio: 'ignore' });
  }

  console.log(`✅ Backup written to ${outputPath}`);
}

main();
