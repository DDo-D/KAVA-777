import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingIncludes: {
    "/api/search": ["./vendor/kpic-mcp/dist/**/*"],
    "/api/screener": ["./vendor/kpic-mcp/dist/**/*"],
  },
};

export default nextConfig;
