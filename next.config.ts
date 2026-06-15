import type { NextConfig } from "next";

// Static export: the dashboard ships as plain files (Render static_site). All
// data + auth go through the Supabase edge function `api`; the browser holds no
// secret. See docs/superpowers/specs/2026-06-12-static-edge-migration-design.md
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
