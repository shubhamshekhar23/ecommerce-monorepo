# Contributing Guide

Thank you for your interest in contributing to the E-Commerce Backend! This guide will help you get started with development and submitting contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

Be respectful and professional. Discrimination, harassment, or hostile behavior will not be tolerated.

## Getting Started

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/ecommerce-backend.git
cd ecommerce-backend
```

### 2. Setup Development Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Update .env with development values
# DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5432/ecommerce_db
# REDIS_URL=redis://localhost:6379

# Start Docker services
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

### 3. Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api/docs
```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
# or for fixes: git checkout -b fix/your-bug-fix
```

**Branch naming conventions:**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `test/description` - Test additions
- `docs/description` - Documentation updates

### 2. Make Your Changes

Follow these principles:

- **Single Responsibility**: Each commit should logically represent one change
- **Keep It Small**: Smaller changes are easier to review and test
- **Self-Documenting Code**: Code should be clear without extensive comments
- **DRY Principle**: Don't repeat yourself; extract reusable code

### 3. Write Tests

All code changes must include tests:

```bash
# Run tests to verify your changes
npm run test

# Check coverage
npm run test:cov

# Check specific test file
npm run test -- src/modules/auth/auth.service.spec.ts
```

**Testing requirements:**
- Unit tests for all services
- 80%+ code coverage
- Test both happy path and error cases
- Mock external dependencies

### 4. Code Quality Checks

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check

# All checks together
npm run lint && npm run format && npm run type-check
```

## Code Standards

### File Organization

```
src/modules/feature/
├── dto/
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── index.ts
├── entities/
│   ├── feature.entity.ts
│   └── index.ts
├── feature.controller.ts
├── feature.service.ts
├── feature.module.ts
└── feature.service.spec.ts
```

### Naming Conventions

- **Files**: kebab-case (e.g., `user-service.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions**: camelCase (e.g., `getUserById()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **DTOs**: PascalCase with `Dto` suffix (e.g., `CreateUserDto`)

### File Size Limits

- **Max 200 lines per file** (excluding imports/exports)
- **Max 20 lines per function** (extract helpers for complex logic)
- **Max 5 parameters per function** (use object for more)

### Type Safety

- ❌ No `any` types
- ✅ Explicit return types on all functions
- ✅ Proper error handling with typed exceptions
- ✅ Use `interface` for object types, `type` for unions

Example:
```typescript
// ❌ Bad
function getUser(id: any): any {
  return users.find(u => u.id === id);
}

// ✅ Good
async function getUserById(id: string): Promise<User> {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }
  return user;
}
```

### Import Organization

1. Node.js built-ins
2. External packages (npm)
3. NestJS imports
4. Internal absolute imports (`@/...`)
5. Relative imports (`./`, `../`)

```typescript
import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
```

### Documentation

Add JSDoc comments for:
- Public methods/functions
- Complex business logic
- Non-obvious algorithm implementations

```typescript
/**
 * Creates a new user account
 * @param createUserDto - User creation data (email, password, name)
 * @returns Promise<User> - Created user (password excluded)
 * @throws {ConflictException} - If email already exists
 * @throws {BadRequestException} - If password doesn't meet requirements
 */
async createUser(createUserDto: CreateUserDto): Promise<User> {
  // Implementation
}
```

## Testing Requirements

### Unit Tests

```bash
npm run test
```

Requirements:
- Test all public methods
- Mock external dependencies (Prisma, Redis, Stripe)
- Use Arrange-Act-Assert pattern
- Target 80%+ coverage

Example:
```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'Test123!' };
      jest.spyOn(usersService, 'validateUser').mockResolvedValue(user);

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
```

### Integration Tests

```bash
npm run test:integration
```

Test database interactions with test database.

### E2E Tests

```bash
npm run test:e2e
```

Test complete user flows end-to-end.

### Coverage Report

```bash
npm run test:cov

# View HTML report
open coverage/lcov-report/index.html
```

## Commit Guidelines

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Test additions/changes
- `docs` - Documentation
- `chore` - Maintenance, dependencies
- `style` - Formatting, semicolons (non-functional)

**Examples:**
```bash
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(products): prevent stock from going negative"
git commit -m "test(cart): add unit tests for cart calculations"
```

### Commit Best Practices

- ✅ One logical change per commit
- ✅ Write meaningful messages (future-you will thank you)
- ✅ Reference issues: `fix(auth): resolve #123`
- ✅ Keep commits under 50 lines changed (usually)
- ❌ Avoid "WIP" or "fix typo" commits in PRs

## Pull Request Process

### 1. Create a Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name
```

Create PR on GitHub with:

**Title:** `[FEATURE/FIX] Brief description`

**Description:**
```markdown
## Description
Brief description of changes

## Related Issue
Closes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Attach screenshots for UI changes
```

### 2. PR Checklist

Before submitting, ensure:
- [ ] Code follows style guidelines
- [ ] All tests pass: `npm run test`
- [ ] Code coverage maintained (80%+)
- [ ] Linting passes: `npm run lint`
- [ ] Formatting correct: `npm run format`
- [ ] Type checking passes: `npm run type-check`
- [ ] No console.logs or debug code
- [ ] Documentation updated (if applicable)
- [ ] Commits are logical and clean

### 3. Code Review

- Respond to comments constructively
- Request changes if needed
- Don't resolve conversations until implementer responds
- Push fixes as new commits (don't force-push)

### 4. Merge

Maintainers will merge when:
- ✅ All tests pass
- ✅ Code review approved
- ✅ Branch is up-to-date with main
- ✅ No conflicts

## Reporting Bugs

### Bug Report Template

Title: `[BUG] Brief description`

**Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Environment:**
- Node.js version
- OS
- Docker version (if applicable)

**Logs:**
```
Paste relevant error logs
```

**Additional Context:**
Any other relevant information

## Feature Requests

### Feature Request Template

Title: `[FEATURE] Brief description`

**Description:**
Clear description of the feature

**Use Case:**
Why this feature is needed

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Suggested Implementation:**
(Optional) Implementation approach

## Questions?

- **Discord/Slack**: Join our community chat
- **GitHub Discussions**: Ask in GitHub Discussions
- **Issues**: Open an issue with `[QUESTION]` label

## Recognition

All contributors will be recognized in:
- CHANGELOG.md
- GitHub contributors page
- Project README

Thank you for contributing! 🚀
