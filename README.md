Readme

Full-stack expense tracker (monorepo).
Monorepo layout: packages/client (React + Vite) and packages/server (TypeScript Lambda handlers ).

Description
Expense Tracker is a simple full-stack app that helps users record and review personal spending.
Key features:

- Add/edit/delete expenses (with categories).
- Budgets per category with progress/alerts.
- Reports: monthly totals, trends, spending-by-category.
- Authentication (email/password, JWT).
- Local development uses an Express wrapper that calls the same Lambda handlers used in production (keeps local and prod behavior identical).
- Frontend uses React + Vite with hooks + presentational view separation. Data fetching and optimistic updates use @tanstack/react-query.

Table of contents

1. Prerequisites
2. Quick start — one-command setup
3. Environment variables & files (what goes where)
4. Run locally (client & server)
5. Build & CI scripts
6. Deploy (server & client)
7. Architecture overview (text + diagram)
8. Key design decisions

Prerequisites
Installed on your machine (recommended):

- Node.js LTS (≥ 20.x)
- pnpm (≥ 10.x) — npm i -g pnpm
- Git
- AWS CLI (if you will deploy the server to AWS) + AWS profile configured (optional for local)
- (Optional) serverless CLI for server deploys (server package already depends on serverless)
- aws CLI profile used in our deploy script: default expense-tracker or set AWS_PROFILE environment variable

Quick start — one-command setup
From the repository root:

# 1) install dependencies for the whole monorepo

pnpm install

# 2) copy env examples to the packages

# -> packages/client/.env

# -> packages/server/.env

# 3) validate envs BEFORE starting or building

# Check both packages:

run at root:
pnpm run check:env

# 4) run build once

pnpm run build # builds client and server

# 5) run the full dev environment (client + local server)

pnpm run dev:all

# OR run just the client or server:

# pnpm --filter client dev

# pnpm --filter server dev

pnpm run dev:all uses the root orchestrator scripts to run both packages. See Run locally below for variations.

Environment variables & files (what goes where)
The repository expects per-package .env files (placed in each package) or shell environment variables. These are validated by scripts/check-env.js (root) using env-manifest.json.
Files:

- packages/client/.env — client-only environment (Vite)
- packages/server/.env — server runtime/use for local dev
- packages/client/env-manifest.json — keys client requires (example shown below)
- packages/server/env-manifest.json — keys server requires
  Minimal sample .env files
  packages/client/.env

VITE_API_BASE=http://localhost:3000

packages/server/.env

MONGO_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=supersecretjwtkey

Sample env-manifest.json (package-level)
packages/client/env-manifest.json

{ "required": ["VITE_API_BASE"] }

packages/server/env-manifest.json

{ "required": ["MONGO_URI", "JWT_SECRET"] }
How env validation works

- A Node script scripts/check-env.js (root) loads package .env (via dotenv) when invoked with --package <name> and validates keys defined in that package's env-manifest.json.
- packages/client/package.json contains predev / prebuild hooks that run the validator before Vite starts or builds: predev: node ../../scripts/check-env.js --package client. That ensures missing client envs fail early (before Vite serves) — see Troubleshooting if your project still starts without error.

Production secrets (AWS SSM)
For production, server secrets are stored in AWS SSM Parameter Store as SecureString. The deploy script reads these values:

- /expense-tracker/mongo-uri → MONGO_URI
- /expense-tracker/jwt-secret → JWT_SECRET
  Create them (example):

aws ssm put-parameter \
 --name /expense-tracker/mongo-uri \
 --type SecureString \
 --value "mongodb+srv://user:pass@cluster.mongodb.net/expense-tracker" \
 --overwrite \
 --profile expense-tracker \
 --region us-east-1

aws ssm put-parameter \
 --name /expense-tracker/jwt-secret \
 --type SecureString \
 --value "a-very-strong-jwt-secret" \
 --overwrite \
 --profile expense-tracker \
 --region us-east-1

Run locally (client & server)
Start server
The server handlers are implemented as AWS Lambda-style functions but you run them locally via an Express harness (no Serverless Offline required).
From repo root:

# run server only (local express)

pnpm --filter server dev

# or inside packages/server

cd packages/server
pnpm dev # uses ts-node-dev and src/local-dev.ts

- The local dev server listens on PORT (defaults to 3000).
- src/local-dev.ts asserts required environment variables via assertEnv and will exit with helpful message if required envs are missing.
  Start client (Vite)
  From repo root:

pnpm --filter client dev

# or inside packages/client

cd packages/client
pnpm dev

Start both together
From repo root:

pnpm run dev:all

dev:all runs both client and server concurrently.

Build & CI scripts
Root-level scripts you can call (summary):

- pnpm run build:all— builds client + server (runs package build scripts)
- pnpm run dev:all — runs both packages in dev mode

Deploy (server & client)
Server (AWS Lambda via Serverless)
The repo contains a deploy wrapper which fetches secrets from SSM and runs Serverless deploy:
Root script (example you shared):

# packages/server/src/scripts/deploy-live.sh

# root: pnpm run deploy:server

Deploy flow:

1. Store secrets in SSM Parameter Store:aws ssm put-parameter --name /expense-tracker/mongo-uri --type SecureString --value "mongodb+srv://..." --profile expense-tracker --region us-east-1
2. aws ssm put-parameter --name /expense-tracker/jwt-secret --type SecureString --value "SOME_SECRET" --profile expense-tracker --region us-east-1
3.
4. From repo root:pnpm run deploy:server
5. The deploy script reads SSM parameters, injects them into the Serverless deploy environment and runs serverless deploy.
   Notes

- You must configure AWS_PROFILE and AWS_REGION (or rely on defaults in the script).
- Serverless will package and deploy Lambda functions and API Gateway endpoints.

Architecture overview (text + diagram)
Text summary

- The project is a monorepo with two main packages:
  - client — React (Vite), purely presentational app that calls server API.
  - server — Serverless handlers for API endpoints, compiled with tsc for deployment.
- MongoDB stores persistent data.
- Authentication uses JWT signed with JWT_SECRET.
- Production secrets stored in AWS SSM; deploy.sh reads them at deploy time.
  Simple diagram

### Architecture

Simple architecture overview (Client ↔ API ↔ MongoDB):

```mermaid
flowchart LR
  Client[Client (Vite) - Browser (VITE_*)] -->|HTTP API| API[API - Serverless Lambdas\nLocal Express (dev)]
  API -->|MongoDB driver| Mongo[MongoDB]



Key design decision

These are the choices and trade-offs made to satisfy the evaluator and to keep the codebase simple and testable:

- Monorepo with pnpm — single dependency install and easy scripts orchestration.
- Functional / single-responsibility — UI is split into presentational views + hooks (data + side-effects). Hooks contain state, views are pure and easy to test.
- React Query — central data-fetching/caching, optimistic updates for create/update/delete, consistent cache invalidation on settled.
- Local express wrapper — provides fast local dev, re-uses the Lambda handler functions so behavior is identical to production (same business logic).
- Env validation — scripts/check-env.js + env-manifest.json to fail early on missing env values
- Immutable & minimal — derived state is memoized (useMemo) and side effects are contained in hooks; code follows DRY and single-responsibility.

Github repo link : https://github.com/Marshall-D/expense-tracker-monorepo

Frontend deployed link : https://main.dfqt4gagqhj6v.amplifyapp.com

Backend deployed links :
endpoints:
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/health
POST - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/auth/register
POST - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/auth/login
POST - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/expenses
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/expenses
PUT - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/expenses/{id}
DELETE - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/expenses/{id}
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/expenses/{id}
POST - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/categories
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/categories
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/categories/{id}
PUT - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/categories/{id}
DELETE - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/categories/{id}
POST - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/budgets
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/budgets
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/budgets/{id}
PUT - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/budgets/{id}
DELETE - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/budgets/{id}
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/reports/monthly
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/reports/by-category
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/reports/trends
GET - https://uphk9dlqh2.execute-api.us-east-1.amazonaws.com/api/export/expenses
```
