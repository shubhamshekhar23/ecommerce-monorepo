// src/shared/config.ts
// Application configuration and environment variables

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
} as const;

export const API_URL = config.api.baseUrl;
