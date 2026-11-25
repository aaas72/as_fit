import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildPgDumpCommands,
  buildPgRestoreCommands,
  formatBackupStamp,
  parseRestoreArgs,
  resolveDbContainerConfig,
} from '../../scripts/db-backup-lib';

describe('cross-platform db backup & restore helpers', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('formats backup timestamps as YYYYMMDD_HHmm', () => {
    const sample = new Date(2026, 10, 5, 7, 9); // Nov 5, 2026 07:09 local
    expect(formatBackupStamp(sample)).toBe('20261105_0709');
  });

  it('resolves defaults and custom overrides from environment variables', () => {
    expect(resolveDbContainerConfig({})).toEqual({
      container: 'asfit-db',
      dbUser: 'asfit',
      dbName: 'asfit',
    });
    expect(
      resolveDbContainerConfig({
        ASFIT_DB_CONTAINER: 'custom-pg',
        POSTGRES_USER: 'custom_user',
        POSTGRES_DB: 'custom_db',
      }),
    ).toEqual({
      container: 'custom-pg',
      dbUser: 'custom_user',
      dbName: 'custom_db',
    });
  });

  it('constructs safe execFileSync argument arrays for pg_dump and pg_restore', () => {
    const cfg = { container: 'asfit-db', dbUser: 'asfit', dbName: 'asfit' };
    const dump = buildPgDumpCommands(cfg, 'backups/asfit_20261105_0709.dump');
    expect(dump.dumpArgs).toEqual([
      'exec', 'asfit-db', 'pg_dump', '-U', 'asfit', '-d', 'asfit', '-Fc', '-f', '/tmp/asfit.dump',
    ]);
    expect(dump.copyOutArgs).toEqual(['cp', 'asfit-db:/tmp/asfit.dump', 'backups/asfit_20261105_0709.dump']);

    const restore = buildPgRestoreCommands(cfg, '/abs/path/asfit.dump');
    expect(restore.copyInArgs).toEqual(['cp', '/abs/path/asfit.dump', 'asfit-db:/tmp/restore.dump']);
    expect(restore.restoreArgs).toEqual([
      'exec', 'asfit-db', 'pg_restore', '-U', 'asfit', '-d', 'asfit', '--clean', '--if-exists', '/tmp/restore.dump',
    ]);
  });

  it('validates restore CLI arguments and supports --yes / -y', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asfit-backup-test-'));
    tempDirs.push(dir);
    const dumpFile = join(dir, 'sample.dump');
    writeFileSync(dumpFile, 'PGDMP');

    expect(parseRestoreArgs(['sample.dump'], dir)).toEqual({
      dumpFilePath: dumpFile,
      autoConfirm: false,
    });
    expect(parseRestoreArgs(['sample.dump', '--yes'], dir)).toEqual({
      dumpFilePath: dumpFile,
      autoConfirm: true,
    });
    expect(parseRestoreArgs(['-y', 'sample.dump'], dir)).toEqual({
      dumpFilePath: dumpFile,
      autoConfirm: true,
    });

    expect(() => parseRestoreArgs([], dir)).toThrow(/Missing dump file path/);
    expect(() => parseRestoreArgs(['--unknown', 'sample.dump'], dir)).toThrow(/Unknown flag/);
    expect(() => parseRestoreArgs(['missing.dump'], dir)).toThrow(/Backup file not found/);
  });
});
