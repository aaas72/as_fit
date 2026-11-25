/**
 * Automated guardrail verifier for AS_FIT open-source contributions.
 * Enforces:
 *  1. Zero CSS Modules (*.module.css) under src/.
 *  2. Zero raw color literals (#hex, rgb(), hsl()) in src/app & src/components (tokens live in globals.css).
 *  3. Zero physical LTR/RTL Tailwind directional classes (ml-, mr-, pl-, pr-, left-, right-, text-left, text-right).
 *  4. Zero direct DB client / Drizzle imports in UI layers (src/app & src/components).
 *  5. Pure domain verification in src/domain (no server, framework, ORM, or Node IO imports).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();

function walkFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

interface Violation {
  file: string;
  line: number;
  rule: string;
  snippet: string;
}

const violations: Violation[] = [];

const HEX_OR_FUNC_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/;
const PHYSICAL_DIR_CLASS_RE = /(?:^|[\s"'`:])(?:ml|mr|pl|pr|left|right)-[a-z0-9[\]./%-]+|(?:^|[\s"'`:])text-(?:left|right)\b|(?:^|[\s"'`:])(?:rounded|border)-(?:l|r)(?:-[a-z0-9[\]./%-]+|\b)/;
const UI_FORBIDDEN_IMPORT_RE = /from\s+['"](?:@\/server\/db(?:\/|$)|drizzle-orm(?:\/|$)|postgres['"])/;
const DOMAIN_FORBIDDEN_IMPORT_RE = /from\s+['"](?:@\/server\/|next(?:\/|$)|drizzle-orm(?:\/|$)|postgres['"]|node:fs|fs['"])/;

for (const file of walkFiles(join(ROOT, 'src'))) {
  if (file.endsWith('.module.css')) {
    violations.push({
      file: relative(ROOT, file),
      line: 1,
      rule: 'no-css-modules',
      snippet: 'CSS Modules are forbidden; use Tailwind v4 semantic utilities.',
    });
  }
}

for (const uiDir of ['src/app', 'src/components']) {
  for (const file of walkFiles(join(ROOT, uiDir))) {
    const ext = extname(file);
    if (ext !== '.ts' && ext !== '.tsx') continue;

    const rel = relative(ROOT, file).replaceAll('\\', '/');
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);

    lines.forEach((text, idx) => {
      const trimmed = text.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

      if (HEX_OR_FUNC_COLOR_RE.test(text)) {
        violations.push({ file: rel, line: idx + 1, rule: 'no-raw-colors', snippet: trimmed });
      }
      if (PHYSICAL_DIR_CLASS_RE.test(text)) {
        violations.push({ file: rel, line: idx + 1, rule: 'logical-rtl-only', snippet: trimmed });
      }
      if (UI_FORBIDDEN_IMPORT_RE.test(text)) {
        violations.push({ file: rel, line: idx + 1, rule: 'no-direct-db-in-ui', snippet: trimmed });
      }
    });
  }
}

for (const file of walkFiles(join(ROOT, 'src/domain'))) {
  const ext = extname(file);
  if (ext !== '.ts' && ext !== '.tsx') continue;

  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);

  lines.forEach((text, idx) => {
    if (DOMAIN_FORBIDDEN_IMPORT_RE.test(text)) {
      violations.push({ file: rel, line: idx + 1, rule: 'pure-domain-only', snippet: text.trim() });
    }
  });
}

if (violations.length > 0) {
  console.error(`\n❌ AS_FIT convention check failed with ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}`);
    console.error(`    ${v.snippet}\n`);
  }
  process.exit(1);
}

console.log('✅ AS_FIT architecture, RTL & design conventions verified (0 violations).');
