import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export interface DbContainerConfig {
  container: string;
  dbUser: string;
  dbName: string;
}

export function resolveDbContainerConfig(env: Record<string, string | undefined> = process.env): DbContainerConfig {
  return {
    container: env.ASFIT_DB_CONTAINER?.trim() || 'asfit-db',
    dbUser: env.POSTGRES_USER?.trim() || 'asfit',
    dbName: env.POSTGRES_DB?.trim() || 'asfit',
  };
}

export function formatBackupStamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function buildPgDumpCommands(cfg: DbContainerConfig, localDest: string) {
  const containerTmp = '/tmp/asfit.dump';
  return {
    dumpArgs: ['exec', cfg.container, 'pg_dump', '-U', cfg.dbUser, '-d', cfg.dbName, '-Fc', '-f', containerTmp],
    copyOutArgs: ['cp', `${cfg.container}:${containerTmp}`, localDest],
    cleanupArgs: ['exec', cfg.container, 'rm', '-f', containerTmp],
  };
}

export function buildPgRestoreCommands(cfg: DbContainerConfig, localDumpPath: string) {
  const containerTmp = '/tmp/restore.dump';
  return {
    copyInArgs: ['cp', localDumpPath, `${cfg.container}:${containerTmp}`],
    restoreArgs: ['exec', cfg.container, 'pg_restore', '-U', cfg.dbUser, '-d', cfg.dbName, '--clean', '--if-exists', containerTmp],
    cleanupArgs: ['exec', cfg.container, 'rm', '-f', containerTmp],
  };
}

export interface RestoreCliOptions {
  dumpFilePath: string;
  autoConfirm: boolean;
}

export function parseRestoreArgs(argv: string[], cwd: string = process.cwd()): RestoreCliOptions {
  let autoConfirm = false;
  let fileArg: string | null = null;

  for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') {
      autoConfirm = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown flag "${arg}". Usage: pnpm db:restore <dump-file> [--yes]`);
    } else if (fileArg === null) {
      fileArg = arg;
    } else {
      throw new Error(`Unexpected extra argument "${arg}". Usage: pnpm db:restore <dump-file> [--yes]`);
    }
  }

  if (!fileArg) {
    throw new Error('Missing dump file path. Usage: pnpm db:restore <dump-file> [--yes]');
  }

  const resolved = resolve(cwd, fileArg);
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new Error(`Backup file not found: ${resolved}`);
  }

  return { dumpFilePath: resolved, autoConfirm };
}
