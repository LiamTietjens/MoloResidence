import type { NextConfig } from "next";

// Migration to a static frontend + Supabase edge `api` is IN PROGRESS.
// `output: 'export'` is deliberately NOT set yet: it forces the whole route tree
// to be statically renderable, but ~10 pages are still force-dynamic Server
// Components mid-migration. The app runs as a normal Next server until every page
// is converted; the final slice flips `output: 'export'` back on for the
// Render static_site deploy. `images.unoptimized` is kept (export needs it later).
// See docs/superpowers/specs/2026-06-12-static-edge-migration-design.md
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
