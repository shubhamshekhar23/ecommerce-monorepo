/* eslint-disable max-lines */
import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TwoFactorVerifyDto, TwoFactorCodeDto } from './dto/two-factor-verify.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { Public, CurrentUser, RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  // ── Registration / Login ──────────────────────────────────────────────────

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000, keyStrategy: 'ip' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000, keyStrategy: 'ip' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<unknown> {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: RequestUser, @Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(user.id, dto.refreshToken);
  }

  // ── Password reset ────────────────────────────────────────────────────────
  // Flow: POST /auth/forgot-password → email with token link
  //       POST /auth/reset-password  → new password using that token

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 3, windowMs: 15 * 60 * 1000, keyStrategy: 'ip' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    // Always 204 — never reveal whether the email is registered
    await this.passwordResetService.requestReset(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000, keyStrategy: 'ip' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }

  // ── TOTP 2FA ──────────────────────────────────────────────────────────────
  // Flow:
  //   1. POST /auth/2fa/setup   → returns { secret, uri } (scan QR with authenticator app)
  //   2. POST /auth/2fa/enable  → confirm with first OTP code → 2FA activated
  //   3. On next login          → login returns { twoFactorRequired, twoFactorToken }
  //   4. POST /auth/2fa/verify  → submit OTP + twoFactorToken → returns real tokens
  //   5. POST /auth/2fa/disable → turn off 2FA (requires current OTP)

  @Post('2fa/setup')
  async setupTotp(@CurrentUser() user: RequestUser): Promise<{ secret: string; uri: string }> {
    return this.authService.setupTotp(user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async enableTotp(
    @CurrentUser() user: RequestUser,
    @Body() dto: TwoFactorCodeDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.enableTotp(user.id, dto.code, req.ip);
  }

  @Post('2fa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowMs: 5 * 60 * 1000, keyStrategy: 'ip' })
  verifyTotp(@Body() dto: TwoFactorVerifyDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.verifyTwoFactor(dto, req.ip, req.headers['user-agent']);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableTotp(
    @CurrentUser() user: RequestUser,
    @Body() dto: TwoFactorCodeDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.disableTotp(user.id, dto.code, req.ip);
  }

  // ── OAuth2 / Google ───────────────────────────────────────────────────────
  // Full PKCE flow:
  //   1. GET /auth/oauth/google
  //      → Passport generates code_verifier + code_challenge (PKCE)
  //      → Redirects to Google with code_challenge, state nonce
  //   2. Google redirects to /auth/oauth/google/callback with authorization_code
  //      → Passport exchanges code + code_verifier for tokens
  //      → GoogleStrategy.validate() is called with profile
  //      → authService.handleOAuthLogin() finds/creates user
  //   3. Callback redirects to the frontend with JWT tokens in the query string

  @Get('oauth/google')
  @Public()
  @UseGuards(AuthGuard('google'))
  initiateGoogleOAuth(): void {
    // Passport handles the redirect; this method body is never reached.
  }

  @Get('oauth/google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const authResponse = req.user as AuthResponseDto;
    res.redirect(
      `/?accessToken=${authResponse.accessToken}&refreshToken=${authResponse.refreshToken}`,
    );
  }
}
