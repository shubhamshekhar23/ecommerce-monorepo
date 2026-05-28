import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

// OAuth2 + PKCE — how this flow works (manually, before Passport abstracts it):
//
//  1. Client generates:
//       code_verifier  = crypto.randomBytes(32).toString('base64url')
//       code_challenge = base64url(sha256(code_verifier))
//
//  2. Redirect user to Google with code_challenge + method=S256 + state=<nonce>
//     (state prevents CSRF; PKCE prevents auth code interception attacks)
//
//  3. Google redirects back with authorization_code
//
//  4. Exchange code for tokens, sending code_verifier:
//       POST https://oauth2.googleapis.com/token
//         { code, code_verifier, client_id, redirect_uri, grant_type }
//     Google verifies: sha256(code_verifier) === code_challenge from step 2.
//     An interceptor who stole the code in step 3 cannot complete this step
//     because they never had code_verifier (it was never sent over the network).
//
//  5. Use id_token / access_token to get user info.
//
// Passport handles steps 2-5. The key learning is WHY PKCE exists:
// without it, a malicious app that registers the same redirect URI can steal
// the code and exchange it for tokens.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? 'dev-placeholder',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') ?? 'dev-placeholder',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') ?? 'http://localhost:4000/api/auth/oauth/google/callback',
      scope: ['email', 'profile'],
      // PKCE: Passport Google strategy v4+ supports this natively.
      // Passport generates the verifier/challenge, stores them in session,
      // and sends the verifier during the token exchange automatically.
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email returned from Google'));
      return;
    }

    try {
      const authResponse = await this.authService.handleOAuthLogin(
        'GOOGLE',
        profile.id,
        email,
        profile.name?.givenName,
        profile.name?.familyName,
      );
      done(null, authResponse);
    } catch (error) {
      done(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
