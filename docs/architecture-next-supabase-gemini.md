# CrackIT 2.0 Architecture Direction

## Decision

CrackIT can move toward a Next.js + Supabase + Gemini architecture, but the migration should be phased. The current Vite + Express app should not be thrown away until authentication, content, MCQs, progress, and bookmarks are stable in the new stack.

## Recommended Free-First Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js API Routes / Route Handlers
- Database: Supabase PostgreSQL
- Auth: Supabase Auth with Google OAuth and email/password
- Realtime: Supabase Realtime for leaderboards and activity feeds
- Vector Search: Supabase pgvector for duplicate detection and future recommendations
- AI: Gemini Flash as the first provider, behind a provider interface
- Resume Parsing: PDF.js for text extraction, AI analysis later
- Hosting: Vercel for frontend and API routes

## Migration Order

1. Create Next.js app shell with the current visual identity.
2. Create Supabase schema and row-level security policies.
3. Migrate users, content, MCQs, companies, roadmaps, progress, bookmarks, notes, and quiz attempts.
4. Rebuild authentication using Supabase Auth.
5. Move content and MCQ APIs into Next.js route handlers.
6. Add Gemini only behind server-side endpoints, never directly from the browser.
7. Add AI modules after the normal platform works without AI.

## Core Tables

- profiles
- content_items
- mcqs
- companies
- roadmaps
- user_progress
- bookmarks
- notes
- quiz_attempts
- quiz_attempt_answers
- xp_transactions
- ai_reports
- study_plans
- readiness_scores
- resume_analysis
- mock_interviews
- admin_quality_flags

## AI Provider Boundary

All AI calls should go through a single server-side interface:

```ts
type AiProvider = {
  generateJson<T>(input: {
    task: string;
    system: string;
    prompt: string;
    schemaName: string;
  }): Promise<T>;
};
```

This keeps CrackIT independent from one AI vendor. Gemini can be provider one; Groq, OpenRouter, OpenAI, Claude, or local models can be added later without rewriting product features.

## AI Modules To Add Later

- AI Quiz Generator
- AI Performance Analyzer
- AI Study Planner
- AI Learning Path Assigner
- AI Company Readiness Checker
- AI Resume Analyzer
- AI Project Recommender
- AI Mock Interviewer
- AI Weekly Intelligence Report
- AI Admin Quality Engine

These must use real student data from the database. No generic AI responses should be shown as if they are personalized.

## Important Rule

The platform must remain useful without AI. AI should improve working systems, not replace missing content, broken auth, or fake dashboards.
