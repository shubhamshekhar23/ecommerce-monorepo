import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createPublicKey } from 'crypto';
import { Public } from '@/common/decorators';

// JWK Set endpoint — the standard way to publish your RS256 public key so any
// service can autodiscover it and verify tokens without being given the key
// out-of-band. See RFC 7517 (JWK) and RFC 7518 (JWA).
//
// How it works:
//   1. We load the PEM public key from env.
//   2. Node.js crypto exports it in JWK (JSON Web Key) format natively.
//   3. We wrap it in a "keys" array (the JWK Set / JWKS format).
//   4. Consumers (e.g. a microservice, a frontend OIDC library) fetch this
//      endpoint and cache the key — they can then verify tokens locally
//      with zero network round-trips per request.
//
// Key rotation: generate a new keypair, add the new key to the array with a
// new "kid", and keep issuing tokens with the new private key. Old tokens
// (signed with the previous key) still verify because the old JWK stays in
// the array until all old tokens have expired.
@ApiTags('auth')
@Controller()
export class JwksController {
  private readonly jwks: object;

  constructor(configService: ConfigService) {
    const pem = (configService.get<string>('JWT_PUBLIC_KEY') ?? '').replace(/\\n/g, '\n');
    const keyObject = createPublicKey(pem);
    const jwk = keyObject.export({ format: 'jwk' }) as Record<string, string>;

    this.jwks = {
      keys: [
        {
          ...jwk,
          use: 'sig',   // "sig" = used for signature verification (not encryption)
          alg: 'RS256',
          kid: 'ecommerce-backend-key-1',
        },
      ],
    };
  }

  @Get('.well-known/jwks.json')
  @Public()
  @ApiOperation({ summary: 'RS256 public key set for JWT verification' })
  getJwks(): object {
    return this.jwks;
  }
}
