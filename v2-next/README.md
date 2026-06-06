# CrackIT V2.0 - Placement Command Center

This folder is the Next.js 14 + Supabase migration target for CrackIT by SJ DEVS.

It is intentionally separate from the current Vite/Express app so the working platform does not break during migration.

## Stack

- Next.js 14 App Router
- TypeScript
- TailwindCSS
- Supabase PostgreSQL/Auth/Storage
- pgvector
- Ollama + Gemma 3 AI engine architecture
- Vercel-ready deployment

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill Supabase URL, anon key, service role key, and Ollama settings.
5. Install dependencies:

```bash
npm install
```

6. Import the real CrackIT datasets:

```bash
npm run seed
```

7. Run locally:

```bash
npm run dev
```

8. For AI features, run Ollama locally:

```bash
ollama pull gemma3
ollama serve
```

## Current V2 Completion

- Folder structure: ready
- Supabase schema: ready
- RLS policies: started
- Dataset importer: ready for DSA, MCQs, companies
- Email login page: ready
- Google login flow: ready, requires Supabase provider setup
- Profile edit page: ready
- Dashboard route: started
- AI performance route: started
- Ollama/Gemma AI engine: ready
- AI quiz generation/submission: ready
- MCQ explanation: ready
- Study planner/readiness/roadmap/recommendations/weekly report: ready
- Quiz API route: started
- Resume analyzer: ready for pasted or parsed resume text
- Admin CMS: pending
- Full UI migration: pending

## Build Status

`npm run build` passes on Next.js 14.2.35.

## Rule

Do not create placeholder content. Seed from the existing `data/datasets` files or from verified admin imports only.

## AI Engine

See `AI_ENGINE.md` for endpoints, Supabase tables, caching, duplicate-question protection, and local Ollama setup.
