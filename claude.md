# E-Commerce Backend - Coding Standards & Best Practices

This document outlines the coding standards and best practices for the e-commerce backend project.

## 1. File & Function Size Limits

**Enforced Rules:**

- **Max 200 lines per file** (excluding imports, exports, and whitespace)
  - Exception: Prisma schema, config files
  - If exceeded: Refactor into multiple files or extract utilities
- **Max 20 lines per function/method**
  - Exception: Test setup/teardown functions
  - If exceeded: Extract helper functions
- **Max 5 parameters per function**
  - Use option objects for more parameters
  - Example: `createUser(options: CreateUserOptions)`
- **Max 3 levels of nesting**
  - Use early returns and guard clauses
  - Extract nested logic into helper functions

## 2. Naming Conventions

**Classes & Interfaces:**

- PascalCase: `UserService`, `CreateProductDto`, `IEmailProvider`
- DTOs: Suffix with `Dto`
- Entities: No suffix needed

**Functions & Variables:**

- camelCase: `getUserById`, `isActive`, `productCount`
- Boolean predicates: `is*`, `has*`, `can*`, `should*`

**Constants:**

- UPPER_SNAKE_CASE: `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`

**Files:**

- kebab-case: `user.service.ts`, `create-order.dto.ts`
- Test files: `*.spec.ts` or `*.e2e-spec.ts`

## 3. Code Organization

**Module Structure:**

```
modules/users/
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── index.ts
├── users.controller.ts
├── users.service.ts
├── users.module.ts
└── users.service.spec.ts
```

**Import Order:**

1. External packages (Node.js built-ins, npm packages)
2. NestJS imports
3. Internal absolute imports (`@/*`)
4. Relative imports (`./`, `../`)

## 4. TypeScript Best Practices

- Strict mode enabled in `tsconfig.json`
- No `any` type → Use `unknown` or proper types
- Explicit return types for all functions
- Prefer `interface` over `type` for objects

## 5. NestJS-Specific Standards

**Controllers:**

- **Thin controllers** - max 30 lines per method
- Only handle HTTP concerns
- Delegate business logic to services

**Services:**

- Single responsibility principle
- Business logic lives here
- Return domain objects

**DTOs:**

- Use `class-validator` decorators
- One DTO per operation
- Use `@ApiProperty()` for Swagger

## 6. Error Handling

- Use NestJS built-in exceptions
- Custom exceptions extend `HttpException`
- Include error codes for client handling
- Log all errors with context

## 7. Testing Standards

**Coverage Requirements:**

- Minimum 80% code coverage
- Critical paths: 100% coverage (auth, payments)

**Test Structure:**

- Use Arrange-Act-Assert (AAA) pattern
- Descriptive test names

## 8. Security Best Practices

- Validate ALL inputs with DTOs
- Never store plain passwords (use bcrypt)
- JWT with short expiry (15min access, 7d refresh)
- No secrets in code → Use environment variables

## 9. Database Optimization

- Use `select` to fetch only needed fields
- Avoid N+1 queries (use `include`)
- Add indexes on frequently queried columns
- Implement pagination (default: 20 items)

## 10. Git & Version Control

**Commit Messages:**

- Format: `type(scope): subject`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Example: `feat(products): add product search with filters`

**Branch Naming:**

- Format: `type/description`
- Examples: `feature/stripe-integration`, `fix/cart-total-calculation`

## 11. Code Review Checklist

- [ ] Follows coding standards (file/function size)
- [ ] Proper error handling
- [ ] Tests included and passing
- [ ] No security vulnerabilities
- [ ] Documentation updated
- [ ] No console.logs (except warn/error)
- [ ] Meaningful variable names
- [ ] DRY principle followed

## 12. Automated Enforcement

**ESLint Rules Applied:**

- max-lines: 200
- max-lines-per-function: 20
- max-params: 5
- max-depth: 3
- complexity: 10
- no-explicit-any: error
- no-console: warn (except warn/error)

**Prettier Configuration:**

- Single quotes
- 2 spaces indentation
- Trailing commas (all)
- Line width: 100 characters
- Semicolons: always

**Pre-commit Hooks:**

- Run linter (ESLint)
- Run formatter check (Prettier)
- Type check with `tsc --noEmit`

## Quick Reference

### Useful Commands

```bash
npm run start:dev      # Development mode with hot reload
npm run build          # Build for production
npm run lint          # Run ESLint with fixes
npm run format        # Format with Prettier
npm run test          # Run unit tests
npm run test:cov      # Run tests with coverage
npm run test:e2e      # Run E2E tests
npm run type-check    # Check TypeScript without building
docker-compose up     # Start all services
```

### File Size Check

```bash
# Check which files exceed 200 lines
find src -name "*.ts" -exec wc -l {} + | sort -rn | head -20
```

### Coverage Report

```bash
npm run test:cov
open coverage/lcov-report/index.html
```

## Resources

- [NestJS Best Practices](https://docs.nestjs.com/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/)
- [Prisma Best Practices](https://www.prisma.io/docs/)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
