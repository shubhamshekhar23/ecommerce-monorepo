import type { NextConfig } from "next";

// Fail fast at build/start time if required env vars are missing.
// The full Zod validation runs in src/shared/config/env.ts at module load.
const requiredEnvVars = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}\nSee apps/frontend/.env.example`,
    );
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
