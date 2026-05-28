/* eslint-disable max-lines */
import {
  Controller, Post, Get, Body, HttpCode, HttpStatus,
  Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { RequestUser } from '@/common/types/request-user.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto } from './dto';
import { TwoFactorVerifyDto, TwoFactorCodeDto } from './dto/two-factor-verify.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { Public, CurrentUser } from '@/common/decorators';
import { RateLimit } from '@/modules/rate-limit/rate-limit.decorator';

@ApiTags('auth')
@Controller('auth')
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
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000, keyStrategy: 'ip' })
  @ApiOperation({ summary: 'Login — returns tokens or a twoFactorToken when 2FA is enabled' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<unknown> {
    return this.authService.login(
      loginDto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke refresh token and log out' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(user.id, refreshTokenDto.refreshToken);
  }

  // ── Password reset ────────────────────────────────────────────────────────
  // Flow: POST /auth/forgot-password → email with token link
  //       POST /auth/reset-password  → new password using that token

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 3, windowMs: 15 * 60 * 1000, keyStrategy: 'ip' })
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    // Always 204 — never reveal whether the email is registered
    await this.passwordResetService.requestReset(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000, keyStrategy: 'ip' })
  @ApiOperation({ summary: 'Reset password using a token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }

  // ── TOTP 2FA ──────────────────────────────────────────────────────────────
  // Flow:
  //   1. POST /auth/2fa/setup   → returns { secret, uri } (scan QR with authenticator app)
  //   2. POST /auth/2fa/enable  → confirm with first OTP code → 2FA activated
  //   3. On next login          → POST /auth/login returns { twoFactorRequired, twoFactorToken }
  //   4. POST /auth/2fa/verify  → submit OTP + twoFactorToken → returns real tokens
  //   5. POST /auth/2fa/disable → turn off 2FA (requires current OTP)

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a TOTP secret — scan the returned URI with an authenticator app' })
  async setupTotp(@CurrentUser() user: RequestUser): Promise<{ secret: string; uri: string }> {
    return this.authService.setupTotp(user.id);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm TOTP setup with first OTP code and activate 2FA' })
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
  @ApiOperation({ summary: 'Complete login by verifying OTP — exchanges twoFactorToken for real tokens' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifyTotp(
    @Body() dto: TwoFactorVerifyDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyTwoFactor(dto, req.ip, req.headers['user-agent']);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable 2FA — requires current OTP to confirm' })
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
  //
  //   2. Google redirects to /auth/oauth/google/callback with authorization_code
  //      → Passport exchanges code + code_verifier for tokens
  //      → GoogleStrategy.validate() is called with profile
  //      → authService.handleOAuthLogin() finds/creates user
  //
  //   3. Callback redirects to the frontend with JWT tokens in the query string
  //      (or sets a cookie — depends on your frontend integration)
  //
  // To use: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env

  @Get('oauth/google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 + PKCE login flow' })
  initiateGoogleOAuth(): void {
    // Passport handles the redirect; this method body is never reached.
  }

  @Get('oauth/google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback — issues JWT tokens' })
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    // req.user is populated by GoogleStrategy.validate()
    const authResponse = req.user as AuthResponseDto;
    // In a real SPA integration, you'd redirect to the frontend with the token
    // as a query param or set it in a secure cookie.
    res.redirect(
      `/?accessToken=${authResponse.accessToken}&refreshToken=${authResponse.refreshToken}`,
    );
  }
}
