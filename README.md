# SENTINEL AI

A real-time healthcare social listening platform that monitors Twitter/X, Reddit, and web sources for patient safety signals, adverse events, and treatment experiences — with AI-powered sentiment analysis, entity extraction, and PII detection.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Development Guide](#development-guide)
- [Key Features](#key-features)
- [Common Commands](#common-commands)

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env  # Create .env with required variables

# Start development mode
pnpm --filter @workspace/api-server run dev
```

The API will be available at `http://localhost:5000`

---

## Prerequisites

- **Node.js**: v24 or higher
- **pnpm**: v8 or higher (required package manager)
- **PostgreSQL**: 13 or higher (for database)
- **OpenAI API Key**: For GPT-4o-mini AI analysis

### Installation

1. **Install pnpm** (if not already installed):
   ```bash
   npm install -g pnpm
   ```

2. **Verify versions**:
   ```bash
   node --version   # Should be v24+
   pnpm --version   # Should be v8+
   ```

---

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Data-Aggregator-Engine
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```
   - This installs dependencies for the root workspace and all monorepo packages
   - Uses `pnpm-workspace.yaml` to manage package dependencies

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/sentinel_ai
   SESSION_SECRET=your-secret-key-here
   AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
   AI_INTEGRATIONS_OPENAI_API_KEY=your-openai-api-key
   NODE_ENV=development
   ```

4. **Initialize the database**:
   ```bash
   pnpm --filter @workspace/db run push
   ```
   - Creates database schema using Drizzle ORM

---

## Running the Project

### Development Mode

Run the API server in development mode (with hot reload):
```bash
pnpm --filter @workspace/api-server run dev
```

This command:
- Compiles TypeScript
- Starts the Express server
- Watches for changes (via NODE_ENV=development)
- Runs on port 5000

### Production Build

Build all packages:
```bash
pnpm run build
```

Then start the API server:
```bash
pnpm --filter @workspace/api-server run start
```

### Type Checking

Check for TypeScript errors across all packages:
```bash
pnpm run typecheck
```

Check only library packages:
```bash
pnpm run typecheck:libs
```

---

## Project Structure

```
.
├── artifacts/                          # Application packages
│   ├── api-server/                     # Express API server
│   │   ├── src/
│   │   │   ├── app.ts                  # Express app configuration
│   │   │   ├── index.ts                # Entry point
│   │   │   ├── lib/
│   │   │   │   ├── ai-analysis.ts      # OpenAI integration & signal analysis
│   │   │   │   ├── data-collectors.ts  # Twitter/Reddit/web collectors
│   │   │   │   └── logger.ts           # Pino logger setup
│   │   │   ├── middlewares/            # Express middlewares
│   │   │   └── routes/                 # API route handlers
│   │   └── build.mjs                   # esbuild configuration
│   ├── signal-watch/                   # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── App.tsx                 # Main App component
│   │   │   ├── pages/                  # Page components
│   │   │   ├── components/             # Reusable UI components
│   │   │   └── hooks/                  # Custom React hooks
│   │   └── vite.config.ts
│   └── mockup-sandbox/                 # Mockup/demo environment
│
├── lib/                                # Shared libraries
│   ├── api-spec/                       # OpenAPI specification
│   │   └── openapi.yaml                # API contract (source of truth)
│   ├── api-client-react/               # Generated React Query hooks
│   │   └── src/generated/api.ts        # Auto-generated from OpenAPI
│   ├── api-zod/                        # Generated Zod validators
│   │   └── src/generated/api.ts        # Auto-generated from OpenAPI
│   ├── db/                             # Database schema & migrations
│   │   ├── src/schema/
│   │   │   ├── projects.ts
│   │   │   ├── signals.ts
│   │   │   ├── sources.ts
│   │   │   ├── keywords.ts
│   │   │   ├── conversations.ts
│   │   │   ├── messages.ts
│   │   │   └── engine-types.ts
│   │   └── drizzle.config.ts
│   └── integrations-openai-ai-server/  # Server-side OpenAI integration
│
├── scripts/                            # Build & utility scripts
├── package.json                        # Root workspace configuration
├── pnpm-workspace.yaml                 # Monorepo workspace config
├── tsconfig.base.json                  # Shared TypeScript config
└── tsconfig.json                       # Root TypeScript config
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Package Manager** | pnpm | ^8.0 |
| **Runtime** | Node.js | 24+ |
| **Language** | TypeScript | ~5.9.2 |
| **API Framework** | Express | ^5 |
| **Frontend** | React | ^18 |
| **Build Tool (Frontend)** | Vite | ^5 |
| **Build Tool (Backend)** | esbuild | ^0.27.3 |
| **Database** | PostgreSQL | 13+ |
| **ORM** | Drizzle ORM | Latest |
| **Validation** | Zod | v4 |
| **API Codegen** | Orval | Latest |
| **HTTP Client** | fetch (custom wrapper) | Native |
| **API Query** | React Query | ^5 |
| **Logging** | Pino | ^9 |
| **AI Integration** | OpenAI GPT-4o-mini | Latest |
| **Code Formatter** | Prettier | ^3.8.1 |

---

## Architecture

### Design Principles

1. **Contract-First Development**
   - OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth
   - Orval codegen automatically generates React hooks and Zod validators
   - Never hand-write generated code

2. **Monorepo Structure**
   - Shared libraries in `/lib` (database, API specs, integrations)
   - Applications in `/artifacts` (api-server, signal-watch frontend)
   - Workspace dependencies via `workspace:*` protocol

3. **AI-Powered Analysis**
   - Uses GPT-4o-mini for signal analysis
   - JSON-mode responses for structured extraction of:
     - Sentiment (positive, negative, neutral)
     - Named entities (medications, conditions, organizations)
     - Safety concerns and severity
     - PII detection and redaction

4. **Data Collection**
   - Multi-source aggregation (Twitter/X, Reddit, web)
   - Engine types configured via admin interface
   - Collector dispatch based on source configuration

### Data Flow

```
Data Sources (Twitter/Reddit/Web)
    ↓
Data Collectors (data-collectors.ts)
    ↓
Raw Signals (Database)
    ↓
AI Analysis (GPT-4o-mini via ai-analysis.ts)
    ↓
Enriched Signals (sentiment, entities, safety flags, PII)
    ↓
Frontend (signal-watch) - Display & Analysis
    ↓
User Dashboard & Alerts
```

---

## Configuration

### Environment Variables

Create `.env` in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sentinel_ai

# Session
SESSION_SECRET=your-secret-session-key

# OpenAI Integration
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...

# Server
NODE_ENV=development
PORT=5000

# Frontend (if separate)
VITE_API_URL=http://localhost:5000/api
```

### Database Schema

Managed by Drizzle ORM with migrations in `lib/db/src/schema/`:
- `projects.ts` - Multi-project workspace
- `signals.ts` - Patient safety signals
- `sources.ts` - Data collection sources
- `keywords.ts` - Monitoring keywords per project
- `conversations.ts` - Chat conversations
- `messages.ts` - Message history
- `engine-types.ts` - Collector engine configurations

---

## API Documentation

### API Spec

Full OpenAPI specification: [lib/api-spec/openapi.yaml](lib/api-spec/openapi.yaml)

### Key Endpoints

- `GET /health` - Health check
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id/signals` - List signals for project
- `POST /api/signals/:id/analyze` - Run AI analysis on signal
- `GET /api/projects/:id/keywords` - List keywords
- `POST /api/projects/:id/keywords` - Add keyword
- `GET /api/sources` - List data sources
- `PUT /api/sources/:id` - Update source configuration

### Regenerate API Code

After modifying `openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates:
- React Query hooks in `lib/api-client-react/src/generated/api.ts`
- Zod validators in `lib/api-zod/src/generated/api.ts`

**Important**: Always verify `lib/api-zod/src/index.ts` exports only `./generated/api` after codegen.

---

## Development Guide

### Adding a New Feature

1. **Update OpenAPI Spec**
   ```bash
   vim lib/api-spec/openapi.yaml
   ```

2. **Regenerate API Code**
   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```

3. **Implement Backend Route**
   ```bash
   vim artifacts/api-server/src/routes/your-route.ts
   ```

4. **Implement Frontend Component**
   ```bash
   vim artifacts/signal-watch/src/pages/YourPage.tsx
   ```

5. **Type Check & Test**
   ```bash
   pnpm run typecheck
   pnpm --filter @workspace/api-server run dev
   ```

### Database Migrations

Add schema changes to `lib/db/src/schema/`:
```bash
vim lib/db/src/schema/your-table.ts
```

Push changes:
```bash
pnpm --filter @workspace/db run push
```

### Logging

Uses Pino with structured logging. Import from `lib/logger.ts`:
```typescript
import { logger } from '../lib/logger';

logger.info({ msg: 'Processing signal', signalId: 123 });
logger.error({ err: error, msg: 'Failed to analyze' });
```

---

## Common Commands

### Installation & Setup
```bash
pnpm install                           # Install all dependencies
pnpm --filter @workspace/db run push   # Initialize database
```

### Development
```bash
pnpm --filter @workspace/api-server run dev    # Start API server
pnpm run typecheck                             # Check TypeScript errors
pnpm run build                                 # Build all packages
```

### Code Generation
```bash
pnpm --filter @workspace/api-spec run codegen # Regenerate API types/hooks
```

### Database
```bash
pnpm --filter @workspace/db run push    # Apply schema changes
pnpm --filter @workspace/db run generate # Generate migration files
```

### Formatting & Linting
```bash
pnpm run format                  # Format all files with Prettier
pnpm run lint                    # Lint code (if configured)
```

---

## Key Features

### Dashboard
- 30-day signal timeline visualization (area chart)
- Sentiment distribution (donut chart)
- Top entities detected
- Safety alerts panel
- Batch analysis capability

### Signals Management
- Real-time signal feed
- Filterable by sentiment and safety flags
- Entity chips by type (drug, disease, organization, etc.)
- Confidence scores for each signal
- PII warnings and redaction
- Per-signal AI analysis trigger

### Keywords & Monitoring
- Per-project keyword management
- Add/remove keywords via chip interface
- Automatic signal matching

### Data Sources
- Source management dashboard
- Enable/disable collection
- Trigger manual collection
- Configure engine types and latency

### Admin Panel
- Engine type management (create, edit, delete)
- Configure collector strategies
- Define config schemas

---

## Important Notes

### Best Practices

1. **After library changes**: Always run `pnpm run typecheck:libs` before restarting the API
2. **After codegen**: Verify `lib/api-zod/src/index.ts` exports only `./generated/api`
3. **Database queries**: `db.execute()` returns `{ rows: [...] }` — always normalize before `.map()`
4. **Signal seeding**: Use `ARRAY['a','b']::text[]` syntax for array fields in SQL

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails after lib changes | Run `pnpm run typecheck:libs` |
| Type errors in generated code | Regenerate with `pnpm --filter @workspace/api-spec run codegen` |
| Database connection fails | Check `DATABASE_URL` in `.env` |
| OpenAI errors | Verify `AI_INTEGRATIONS_OPENAI_API_KEY` |
| pnpm not found | Install with `npm install -g pnpm` |

---

## License

MIT

---

## Support

For issues, questions, or contributions, please refer to the project documentation or contact the development team.
