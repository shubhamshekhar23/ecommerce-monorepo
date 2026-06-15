// src/shared/config.ts
// Application configuration and environment variables

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  },
} as const;

export const API_URL = config.api.baseUrl;
