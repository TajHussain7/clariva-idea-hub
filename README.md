# Clariva - Creative Idea Hub

Clariva is a modern application designed to facilitate creative brainstorming, idea tracking, and AI-powered validation. It features a React-based frontend dashboard, an Express-based API server backend, and a PostgreSQL database layer managed with Drizzle ORM.

---

## Technical Stack

- **Frontend**: React + Vite, Tailwind CSS v4, Radix UI, TanStack Query, Framer Motion
- **Backend**: Node.js + Express, Pino Logging, express-session
- **Database**: PostgreSQL (Supabase or Local), Drizzle ORM
- **Package Manager**: pnpm (Workspaces)

---

## Prerequisites

Ensure you have the following installed on your machine:
1. **Node.js** (v18 or higher recommended)
2. **pnpm** (v9 or higher recommended)

---

## Getting Started

### 1. Install Dependencies
Run the following command at the root directory of the workspace:
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the required values:
```bash
cp .env.example .env
```
Ensure you provide:
- `DATABASE_URL`: Your PostgreSQL connection string. (See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for details).
- `SESSION_SECRET`: A secure key for signing cookies.
- `AI_INTEGRATIONS_OPENROUTER_API_KEY`: A valid OpenRouter API key.

### 3. Push Database Schema
To create all the tables in your PostgreSQL database, run:
```bash
pnpm db:push
```

### 4. Run Development Servers
Start both the backend API server and frontend application concurrently:
```bash
pnpm dev
```
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **Mockup Sandbox**: [http://localhost:5174](http://localhost:5174) (Run `pnpm --filter @workspace/mockup-sandbox dev` to launch separately if needed).

---

## Documentation

- [Supabase Setup Guide](SUPABASE_SETUP.md): Step-by-step instructions on database setup and linking.
