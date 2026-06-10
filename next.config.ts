import type { NextConfig } from "next";

// Server-rendered Next app (plan §6/§7): Server Components + Server Actions with
// the service-role key, deployed as a single Render Web Service (`npm start`).
// No static export — the browser never gets direct DB access.
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
