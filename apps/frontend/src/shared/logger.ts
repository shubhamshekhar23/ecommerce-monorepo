// Thin wrapper so every log goes through one place.
// Phase 10: uncomment Sentry lines when @sentry/nextjs is installed.
// import * as Sentry from '@sentry/nextjs';

export const logger = {
  debug(msg: string, ctx?: object): void {
    if (process.env.NODE_ENV === "development") {
      console.debug("[debug]", msg, ctx ?? "");
    }
  },

  info(msg: string, ctx?: object): void {
    console.info("[info]", msg, ctx ?? "");
  },

  warn(msg: string, ctx?: object): void {
    console.warn("[warn]", msg, ctx ?? "");
  },

  error(msg: string, error?: unknown, ctx?: object): void {
    console.error("[error]", msg, error, ctx ?? "");
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { extra: { msg, ...ctx } });
    // }
  },

  // Call after login; cleared on logout.
  // Phase 10: Sentry.setUser({ id, email }) / Sentry.setUser(null)
  setUser(_: { id: string; email: string } | null): void {},
};
