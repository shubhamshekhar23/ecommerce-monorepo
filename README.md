# E-Commerce Monorepo

A modern e-commerce application using npm workspaces with a Next.js frontend and Node.js backend.

## Structure

```
ecommerce-monorepo/
├── apps/
│   ├── frontend/    # Next.js frontend application
│   └── backend/     # Backend API server
├── package.json     # Root workspace configuration
└── README.md
```

## Getting Started

### Install Dependencies

```bash
npm install
```

This installs dependencies for both the frontend and backend using npm workspaces.

## Development

### Start both frontend and backend in parallel

```bash
npm run dev
```

### Start only frontend

```bash
npm run frontend
```

### Start only backend

```bash
npm run backend
```

## Building

### Build all workspaces

```bash
npm run build
```

## Testing

### Run tests across all workspaces

```bash
npm run test
```

## Linting

### Run linting across all workspaces

```bash
npm run lint
```

## Workspace Commands

You can also run commands in specific workspaces:

```bash
# Run in frontend only
npm run dev --workspace=apps/frontend

# Run in backend only
npm run dev --workspace=apps/backend

# Run in all workspaces
npm run dev --workspaces
```

## Notes

- Both frontend and backend maintain their own `package.json` files
- The root `package.json` coordinates workspaces only
- Each workspace runs independently but shares dependencies via npm
