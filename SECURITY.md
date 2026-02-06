# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please email **security@example.com** instead of using the issue tracker. Please include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if you have one)

We will:

- Acknowledge receipt within 48 hours
- Provide a timeline for fix and disclosure
- Keep you updated on progress
- Credit you in the security advisory (optional)

**Please do not publicly disclose the vulnerability until we've had time to fix it.**

## Security Best Practices

### 1. Authentication & Passwords

**Password Security:**

- Minimum 8 characters required
- Must contain: uppercase, lowercase, number, special character
- Hashed with bcrypt (12 rounds)
- Never logged or exposed in errors
- Never sent via email (only reset link)

**JWT Tokens:**

- Access tokens: 15 minute expiry (short-lived)
- Refresh tokens: 7 day expiry (long-lived)
- Different secrets for access/refresh (NEVER share)
- Tokens stored securely in frontend (HttpOnly cookies recommended)
- Revoked tokens checked against database

**Token Security:**

- ✅ Validate signature on every request
- ✅ Check token expiration
- ✅ Verify token hasn't been revoked
- ✅ Use HTTPS in production (never HTTP)
- ❌ Never log tokens
- ❌ Never embed in URLs

### 2. Data Protection

**At Rest:**

- Database: Use PostgreSQL with encryption (optional)
- Backups: Encrypt with GPG or AWS KMS
- Secrets: Use environment variables, never commit to git
- Sensitive fields: Never return in API responses

**In Transit:**

- HTTPS/TLS 1.2+ required in production
- HSTS headers enforced (1 year, includeSubDomains)
- Certificate validation required
- Forward secrecy enabled

**Sensitive Data:**

- Email addresses: Hash for lookups, never expose
- Passwords: bcrypt with 12 rounds
- Tokens: HttpOnly, Secure, SameSite cookies
- Credit cards: Never stored (use Stripe)
- API keys: Encrypted, rotated regularly

### 3. Input Validation

**All inputs validated:**

```typescript
// ✅ Good - DTOs with validation
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  password: string;
}

// ❌ Bad - No validation
@Post('/users')
createUser(@Body() user: any) { }
```

**Validation covers:**

- Type checking
- Length limits
- Format validation (email, URL, phone)
- Whitelist allowed values
- Range validation (min/max)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (never trust user input in templates)

### 4. Authorization

**Role-Based Access Control (RBAC):**

```typescript
enum UserRole {
  USER = 'user',    // Customer
  ADMIN = 'admin',  // Full access
}

// Enforce at route level
@Roles(UserRole.ADMIN)
@Delete('/:id')
deleteProduct() { }

// Enforce at service level
if (user.role !== UserRole.ADMIN) {
  throw new ForbiddenException();
}
```

**Resource-Level Authorization:**

```typescript
// User can only access their own profile
@Get('/me')
getProfile(@CurrentUser() user: User) {
  return this.usersService.findById(user.id);
}

// User can only view their own orders
@Get('/:id')
getOrder(
  @Param('id') orderId: string,
  @CurrentUser() user: User,
) {
  const order = await this.ordersService.findById(orderId);
  if (order.userId !== user.id) {
    throw new ForbiddenException();
  }
  return order;
}
```

### 5. Rate Limiting

**Implemented at Nginx level:**

```nginx
# Authentication endpoints: 5 requests per minute per IP
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# API endpoints: 10 requests per second per IP
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/auth/login {
  limit_req zone=auth_limit burst=10 nodelay;
}
```

**Database rate limiting (optional):**

```typescript
// Track login attempts
@Post('/login')
async login(@Body() dto: LoginDto, @Req() req: Request) {
  const attempts = await redis.incr(`login:${req.ip}`);
  if (attempts > 5) {
    throw new TooManyRequestsException();
  }
}
```

### 6. CORS & CSRF

**CORS Configuration:**

```typescript
// Only allow trusted origins
const app = createNestApplication(AppModule, {
  cors: { origin: ['https://example.com', 'https://app.example.com'] },
});
```

**CSRF Protection:**

- GET requests: Safe (no state change)
- POST/PUT/DELETE: Require JWT token (CSRF token not needed)
- Cookies: SameSite=Strict (never send cross-site)

### 7. Stripe Integration Security

**Webhook Signature Verification:**

```typescript
@Post('/webhook')
@Public()
handleStripeWebhook(
  @Body() body: any,
  @Req() request: Request,
) {
  const signature = request.headers['stripe-signature'];

  // ✅ Always verify signature
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new BadRequestException('Invalid signature');
  }
}
```

**Idempotency:**

- Stripe automatically handles with client-provided idempotency key
- Store payment intent IDs to prevent duplicate charges

**API Keys:**

- ✅ Use restricted API keys (only required permissions)
- ✅ Rotate keys every 90 days
- ✅ Use test keys in development
- ✅ Use live keys in production
- ❌ Never commit API keys to git
- ❌ Never share secret keys via email

### 8. File Upload Security

**File Validation:**

```typescript
// Validate file type
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.mimetype)) {
  throw new BadRequestException('Invalid file type');
}

// Validate file size (max 5MB)
const maxSize = 5 * 1024 * 1024;
if (file.size > maxSize) {
  throw new BadRequestException('File too large');
}

// Generate safe filename (prevent path traversal)
const safeFilename = `${uuidv4()}-${sanitize(file.originalname)}`;
```

**Storage Security:**

- Store outside web root
- Don't allow direct execution (no .exe, .php, .sh)
- Set proper file permissions (644)
- Scan for malware (ClamAV optional)

### 9. Logging & Monitoring

**What to log:**

- ✅ Authentication attempts (success/failure)
- ✅ Authorization failures (403 Forbidden)
- ✅ Data access (sensitive operations)
- ✅ Configuration changes
- ✅ Errors (with context)

**What NOT to log:**

- ❌ Passwords (any form)
- ❌ API keys or tokens
- ❌ Credit card numbers
- ❌ Personally identifiable information (PII)
- ❌ Full stack traces in production

**Log Format (Pino structured):**

```json
{
  "level": "info",
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "req-123",
  "userId": "user-456",
  "action": "login_success",
  "ip": "192.168.1.1",
  "message": "User logged in successfully"
}
```

### 10. Infrastructure Security

**Docker Security:**

- ✅ Run as non-root user (nestjs:1001)
- ✅ Use distroless images (smaller attack surface)
- ✅ Pin image versions (never use `latest`)
- ✅ Scan images for vulnerabilities
- ❌ Don't expose secrets in Dockerfile

**Kubernetes (if used):**

- Network policies (restrict traffic between pods)
- Pod security policies (enforce security standards)
- RBAC (role-based access control)
- Service mesh (mTLS between services)

**Database Security:**

- ✅ Strong passwords (20+ chars, mix of types)
- ✅ Restricted network access (private subnet)
- ✅ Connection encryption (SSL)
- ✅ Regular backups (encrypted, tested)
- ✅ Automated updates (patch Postgres)
- ❌ Never expose to public internet

### 11. Dependency Management

**Secure Dependencies:**

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update to latest versions (with care)
npm update

# Pin versions in package-lock.json (use npm ci in production)
npm ci  # Production: deterministic installs
npm install  # Development: allow updates
```

**Dependency Best Practices:**

- ✅ Use exact versions in production
- ✅ Regularly update dependencies (monthly)
- ✅ Audit before updating
- ✅ Test thoroughly after updates
- ✅ Remove unused dependencies
- ❌ Don't use packages with many vulnerabilities
- ❌ Don't use unmaintained packages

### 12. Code Review Security Checklist

Before merging, verify:

- [ ] No hardcoded secrets (API keys, passwords)
- [ ] Input validation on all endpoints
- [ ] Authentication required on protected routes
- [ ] Authorization checked at service level
- [ ] No SQL injection (using Prisma parameterized queries)
- [ ] No XSS vulnerabilities (sanitizing user input)
- [ ] Error messages don't expose internals
- [ ] Rate limiting configured
- [ ] Logging doesn't expose sensitive data
- [ ] Dependencies are up-to-date
- [ ] Tests include security scenarios

## Security Incident Response

### If a Vulnerability is Found

1. **Acknowledge**: Respond within 48 hours
2. **Assess**: Understand scope and impact
3. **Patch**: Create fix and test thoroughly
4. **Release**: Push security update (patch version)
5. **Announce**: Public advisory with CVE
6. **Follow-up**: Monitor for exploitation

### Major Incident Escalation

For critical vulnerabilities:

- Create security advisory
- Recommend immediate upgrade
- Provide workarounds if needed
- Coordinate with affected users

## Security Features Summary

| Feature                  | Implementation              | Status |
| ------------------------ | --------------------------- | ------ |
| HTTPS/TLS                | Nginx reverse proxy         | ✅     |
| JWT Authentication       | Passport.js + custom guards | ✅     |
| Password Hashing         | Bcrypt (12 rounds)          | ✅     |
| Input Validation         | class-validator DTOs        | ✅     |
| Rate Limiting            | Nginx rate limiting         | ✅     |
| CORS                     | Whitelist origins           | ✅     |
| CSRF                     | JWT token (implicit)        | ✅     |
| SQL Injection Prevention | Prisma ORM                  | ✅     |
| XSS Prevention           | Input validation            | ✅     |
| HTTPS Headers            | Nginx security headers      | ✅     |
| Structured Logging       | Pino JSON logs              | ✅     |
| Monitoring & Alerts      | Prometheus + Grafana        | ✅     |
| Backup Strategy          | Automated encrypted backups | ✅     |
| Dependency Scanning      | npm audit                   | ✅     |
| Secret Management        | Environment variables       | ✅     |

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Stripe Security](https://stripe.com/docs/security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

For security questions or to report vulnerabilities:

- **Email**: security@example.com
- **PGP Key**: [Link to public key]

---

**Last Updated**: January 2024
**Version**: 1.0.0
