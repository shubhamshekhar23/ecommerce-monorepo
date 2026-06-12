export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh' | '2fa_pending';
  iat?: number;
  exp?: number;
}
