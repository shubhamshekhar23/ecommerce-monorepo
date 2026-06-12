import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

// OAuth2 + PKCE flow:
//   1. Client is redirected to Google with code_challenge + state nonce
//   2. Google redirects back with authorization_code
//   3. Passport exchanges code + code_verifier for tokens
//   4. GoogleStrategy.validate() is called with the profile
//   5. authService.handleOAuthLogin() finds/creates the user
//
// PKCE prevents auth code interception: the code_verifier is never sent over
// the network during the redirect, so an intercepted code cannot be exchanged.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? 'dev-placeholder',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') ?? 'dev-placeholder',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3006/api/auth/oauth/google/callback',
      scope: ['email', 'profile'],
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
