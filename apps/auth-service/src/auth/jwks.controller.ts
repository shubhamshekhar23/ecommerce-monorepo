import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'crypto';
import { Public } from '../common/decorators';

// JWK Set endpoint — publishes the RS256 public key so any service can
// autodiscover it and verify tokens without being given the key out-of-band.
// See RFC 7517 (JWK) and RFC 7518 (JWA).
//
// Key rotation: add the new key to the array with a new "kid" and keep the
// old one until all tokens signed with it have expired.
@Controller()
export class JwksController {
  private readonly jwks: object;

  constructor(configService: ConfigService) {
    const pem = (configService.get<string>('jwt.publicKey') ?? '').replace(/\\n/g, '\n');
    const keyObject = createPublicKey(pem);
    const jwk = keyObject.export({ format: 'jwk' }) as Record<string, string>;

    this.jwks = {
      keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: 'auth-service-key-1' }],
    };
  }

  @Get('.well-known/jwks.json')
  @Public()
  getJwks(): object {
    return this.jwks;
  }
}
