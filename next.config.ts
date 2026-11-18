import type { NextConfig } from 'next';

// The CSP only uses directives that cannot break Next.js rendering: it does not restrict
// scripts or styles, so hydration, next/font and Recharts keep working unchanged.
const contentSecurityPolicy = [
  "frame-ancestors 'none'", // no embedding in iframes (clickjacking on delete buttons)
  "base-uri 'self'",        // an injected <base> cannot redirect relative URLs
  "form-action 'self'",     // forms can only post back to this app
  "object-src 'none'",      // no plugins
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' }, // older browsers without frame-ancestors
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' }, // health data URLs never leak to other sites
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  // Standalone output only for the Docker image (Dockerfile sets NEXT_OUTPUT); `next start` needs the regular build.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
