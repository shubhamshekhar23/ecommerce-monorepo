export default async function globalTeardown(): Promise<void> {
  await Promise.all([
    (global as any).__PG_CONTAINER__?.stop(),
    (global as any).__REDIS_CONTAINER__?.stop(),
  ]);
}
