# CrackIT AI Engine

This is a real server-side AI engine, not a chatbot wrapper.

## Runtime

- Next.js 14 API routes
- Supabase for auth, history, reports, cache, and progress
- Ollama local runtime
- Primary model: `gemma3`

## Required Local Setup

```bash
ollama pull gemma3
ollama serve
```

Create `v2-next/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3
AI_CACHE_TTL_HOURS=24
```

Run the SQL in `v2-next/supabase/schema.sql` before using the AI endpoints.

## API Surface

- `POST /api/ai/quiz/generate`
- `POST /api/ai/quiz/submit`
- `POST /api/ai/mcq/explain`
- `POST /api/ai/resume/analyze`
- `POST /api/ai/study-plan`
- `POST /api/ai/readiness`
- `POST /api/ai/roadmap`
- `GET /api/ai/weak-topics`
- `GET /api/ai/recommendations`
- `POST /api/ai/weekly-report`

All routes require a Supabase session. If Ollama is not running, the route returns `503` with a setup hint instead of fake data.

## Storage

The engine writes to:

- `ai_reports`
- `resume_reports`
- `study_plans`
- `readiness_scores`
- `quiz_history`
- `user_progress`
- `mcq_results`
- `ai_cache`

## Duplicate Control

Quiz generation hashes normalized question text, sorted options, and correct answer. The engine rejects duplicates already present in seeded MCQs or the user's generated quiz history.

## Personalization Inputs

The engine uses:

- DSA progress
- MCQ results
- Generated quiz history
- Resume reports
- Profile skills and academic context
- Weak topic calculations from stored attempts
