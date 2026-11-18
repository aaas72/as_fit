import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

const rules = await nextConfig.headers!();
const headers = rules[0]?.headers ?? [];
const header = (key: string) => headers.find((h) => h.key === key)?.value ?? '';

describe('security headers (next.config.ts)', () => {
  it('applies to every route', () => {
    expect(rules).toHaveLength(1);
    expect(rules[0]?.source).toBe('/:path*');
  });

  it('blocks framing in both modern and older browsers', () => {
    expect(header('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(header('X-Frame-Options')).toBe('DENY');
  });

  it('does not restrict scripts or styles, so Next.js hydration keeps working', () => {
    expect(header('Content-Security-Policy')).not.toMatch(/script-src|style-src|default-src/);
  });

  it('sets the remaining hardening headers', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('no-referrer');
    expect(header('Permissions-Policy')).toContain('camera=()');
  });

  it('keeps the X-Powered-By header disabled', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
