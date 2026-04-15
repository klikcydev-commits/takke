import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

const appDir = path.resolve(__dirname);
const repoRoot = path.resolve(__dirname, "../..");
const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(repoRoot, dev);
loadEnvConfig(appDir, dev);

function pub(name: string): string {
  return process.env[name]?.trim() ?? "";
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: pub("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: pub("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_SUPABASE_KEY: pub("NEXT_PUBLIC_SUPABASE_KEY"),
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
