import { execSync } from 'child_process';
import { generateKeyPairSync } from 'crypto';
import { join } from 'path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';

export default async function globalSetup(): Promise<void> {
  const [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('ecommerce_test')
      .withUsername('postgres')
      .withPassword('postgres')
      .start(),
    new GenericContainer('redis:7-alpine').withExposedPorts(6379).start(),
  ]);

  const dbUrl = pgContainer.getConnectionUri();
  const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

  /*
   - Generate a throw-away RS256 key pair for JWT signing in tests.
   - The public key is set as JWT_PUBLIC_KEY so JwtStrategy can verify tokens.
   - The private key is stored on global so e2e specs can sign test tokens.
   */
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  process.env.DATABASE_URL = dbUrl;
  process.env.REDIS_URL = redisUrl;
  process.env.JWT_PUBLIC_KEY = publicKeyPem.replace(/\n/g, '\\n');

  /*
   - Store references on global so:
   -   globalTeardown (same process) can stop the containers
   -   e2e specs can read TEST_JWT_PRIVATE_KEY from process.env to sign tokens
   */
  (global as any).__PG_CONTAINER__ = pgContainer;
  (global as any).__REDIS_CONTAINER__ = redisContainer;
  process.env.TEST_JWT_PRIVATE_KEY = privateKeyPem;

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
  });
}
